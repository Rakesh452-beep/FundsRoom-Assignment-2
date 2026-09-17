const prisma = require('../config/db');
const AppError = require('../utils/AppError');
const { generateNumber } = require('../utils/numberGenerator');
const constants = require('../config/constants');
const { AuditLog } = require('../utils/helpers');

async function list({ status, page = 1, limit = 20 }) {
  const where = {};
  if (status) where.status = status;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        quotation: { include: { items: { include: { product: true } } } },
        items: { include: { product: { include: { inventory: true } } } },
        dispatches: { select: { id: true, dispatchNumber: true, dispatchDate: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.salesOrder.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getById(id) {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      quotation: { include: { items: { include: { product: true } } } },
      items: { include: { product: { include: { inventory: true } } } },
      dispatches: { include: { items: { include: { product: true } }, processedBy: { select: { id: true, name: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!salesOrder) throw new AppError(404, 'SALES_ORDER_NOT_FOUND', 'Sales order not found');
  return salesOrder;
}

async function convertFromQuotation(quotationId, userId) {
  const salesOrder = await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({
      where: { id: quotationId },
      include: { items: { include: { product: true } } },
    });
    if (!quotation) throw new AppError(404, 'QUOTATION_NOT_FOUND', 'Quotation not found');
    if (quotation.status !== constants.QuotationStatus.ACCEPTED) {
      throw new AppError(400, 'QUOTATION_NOT_ACCEPTED', 'Only accepted quotations can be converted');
    }
    const existing = await tx.salesOrder.findUnique({ where: { quotationId } });
    if (existing) throw new AppError(409, 'SALES_ORDER_EXISTS', 'A sales order already exists for this quotation');

    const orderNumber = await generateNumber(constants.NumberPrefix.SALES_ORDER, 'sales_orders', 'orderNumber');

    const created = await tx.salesOrder.create({
      data: {
        orderNumber,
        quotationId,
        customerId: quotation.customerId,
        discountPct: quotation.discountPct,
        gstPct: quotation.gstPct,
        totalAmount: quotation.grandTotal,
        status: constants.SalesOrderStatus.PENDING,
        createdById: userId,
        items: {
          create: quotation.items.map((it) => ({
            productId: it.productId,
            qty: it.qty,
            unitPrice: it.unitPrice,
            lineAmount: it.lineAmount,
          })),
        },
      },
      include: { items: true },
    });

    await tx.enquiry.update({ where: { id: quotation.enquiryId }, data: { status: constants.EnquiryStatus.WON } });
    await AuditLog.record(tx, {
      actorId: userId,
      action: 'CONVERT',
      entity: 'SalesOrder',
      entityId: created.id,
      quotationId,
      after: { orderNumber, quotationNumber: quotation.quotationNumber },
    });
    return created;
  });
  return salesOrder;
}

async function confirm(id, userId) {
  const result = await prisma.$transaction(async (tx) => {
    const salesOrder = await tx.salesOrder.findUnique({
      where: { id },
      include: { items: true, dispatches: true },
    });
    if (!salesOrder) throw new AppError(404, 'SALES_ORDER_NOT_FOUND', 'Sales order not found');
    if (salesOrder.status !== constants.SalesOrderStatus.PENDING) {
      throw new AppError(400, 'INVALID_SO_STATUS', 'Only pending sales orders can be confirmed');
    }

    for (const item of salesOrder.items) {
      const rows = await tx.$queryRaw`
        SELECT "physicalQty", "reservedQty"
        FROM "inventory"
        WHERE "productId" = ${item.productId}
        FOR UPDATE
      `;
      if (!rows.length) {
        throw new AppError(400, 'INSUFFICIENT_STOCK', `Insufficient available stock for product ${item.productId}`);
      }
      const available = Number(rows[0].physicalQty) - Number(rows[0].reservedQty);
      if (available < item.qty) {
        throw new AppError(400, 'INSUFFICIENT_STOCK', `Insufficient available stock for product ${item.productId}`);
      }
      const updated = await tx.$executeRaw`
        UPDATE "inventory"
        SET "reservedQty" = "reservedQty" + ${item.qty}
        WHERE "productId" = ${item.productId}
          AND ("physicalQty" - "reservedQty") >= ${item.qty}
      `;
      if (updated === 0) {
        throw new AppError(400, 'INSUFFICIENT_STOCK', `Insufficient available stock for product ${item.productId}`);
      }
    }

    const updated = await tx.salesOrder.update({
      where: { id },
      data: { status: constants.SalesOrderStatus.CONFIRMED },
    });

    await AuditLog.record(tx, {
      actorId: userId,
      action: 'CONFIRM',
      entity: 'SalesOrder',
      entityId: id,
      before: { status: salesOrder.status },
      after: { status: constants.SalesOrderStatus.CONFIRMED },
    });

    return updated;
  });
  return result;
}

async function dispatch(id, data, userId) {
  const result = await prisma.$transaction(async (tx) => {
    const salesOrder = await tx.salesOrder.findUnique({
      where: { id },
      include: { items: true, dispatches: true },
    });
    if (!salesOrder) throw new AppError(404, 'SALES_ORDER_NOT_FOUND', 'Sales order not found');
    if (salesOrder.status !== constants.SalesOrderStatus.CONFIRMED) {
      throw new AppError(400, 'INVALID_SO_STATUS', 'Only confirmed sales orders can be dispatched');
    }
    if (salesOrder.dispatches.length > 0) {
      throw new AppError(409, 'ALREADY_DISPATCHED', 'This sales order has already been dispatched');
    }

    const dispatchNumber = await generateNumber(constants.NumberPrefix.DISPATCH, 'dispatches', 'dispatchNumber');

    for (const item of salesOrder.items) {
      const reserved = await tx.inventory.findUnique({ where: { productId: item.productId } });
      if (!reserved || (reserved.reservedQty ?? 0) < item.qty) {
        throw new AppError(400, 'NOT_RESERVED', `Cannot dispatch product ${item.productId}: not fully reserved`);
      }
      const inv = await tx.$executeRaw`
        UPDATE "inventory"
        SET "physicalQty" = "physicalQty" - ${item.qty},
            "reservedQty" = "reservedQty" - ${item.qty}
        WHERE "productId" = ${item.productId}
          AND "reservedQty" >= ${item.qty}
      `;
      if (inv === 0) {
        throw new AppError(400, 'INSUFFICIENT_RESERVATION', `Cannot dispatch product ${item.productId}`);
      }
    }

    const dispatchRecord = await tx.dispatch.create({
      data: {
        dispatchNumber,
        salesOrderId: id,
        dispatchDate: new Date(),
        vehicleNo: data.vehicleNo,
        driver: data.driver || null,
        processedById: userId,
        items: {
          create: salesOrder.items.map((it) => ({ productId: it.productId, qty: it.qty })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    await tx.salesOrder.update({
      where: { id },
      data: { status: constants.SalesOrderStatus.DISPATCHED },
    });

    await AuditLog.record(tx, {
      actorId: userId,
      action: 'DISPATCH',
      entity: 'Dispatch',
      entityId: dispatchRecord.id,
      dispatchId: dispatchRecord.id,
      before: { status: salesOrder.status },
      after: { status: constants.SalesOrderStatus.DISPATCHED, dispatchNumber },
    });

    return dispatchRecord;
  });
  return result;
}

async function cancel(id, userId) {
  return prisma.$transaction(async (tx) => {
    const salesOrder = await tx.salesOrder.findUnique({ where: { id }, include: { items: true } });
    if (!salesOrder) throw new AppError(404, 'SALES_ORDER_NOT_FOUND', 'Sales order not found');
    if (![constants.SalesOrderStatus.PENDING, constants.SalesOrderStatus.CONFIRMED].includes(salesOrder.status)) {
      throw new AppError(400, 'INVALID_SO_STATUS', 'Only pending or confirmed sales orders can be cancelled');
    }
    if (salesOrder.status === constants.SalesOrderStatus.CONFIRMED) {
      for (const item of salesOrder.items) {
        await tx.$executeRaw`
          UPDATE "inventory"
          SET "reservedQty" = GREATEST("reservedQty" - ${item.qty}, 0)
          WHERE "productId" = ${item.productId}
        `;
      }
    }
    const updated = await tx.salesOrder.update({ where: { id }, data: { status: constants.SalesOrderStatus.CANCELLED } });
    await AuditLog.record(tx, {
      actorId: userId,
      action: 'CANCEL',
      entity: 'SalesOrder',
      entityId: id,
      before: { status: salesOrder.status },
      after: { status: constants.SalesOrderStatus.CANCELLED },
    });
    return updated;
  });
}

module.exports = { list, getById, convertFromQuotation, confirm, dispatch, cancel };
