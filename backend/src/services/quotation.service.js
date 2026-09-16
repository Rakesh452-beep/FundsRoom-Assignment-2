const prisma = require('../config/db');
const AppError = require('../utils/AppError');
const { generateNumber } = require('../utils/numberGenerator');
const { calculateQuotationTotals } = require('../utils/calculate');
const constants = require('../config/constants');
const { AuditLog } = require('../utils/helpers');

async function list({ status, page = 1, limit = 20 }) {
  const where = {};
  if (status) where.status = status;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      include: { customer: true, enquiry: { select: { enquiryNumber: true } }, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.quotation.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getById(id) {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      enquiry: { include: { items: { include: { product: true } } } },
      items: { include: { product: true } },
      salesOrder: true,
      createdBy: { select: { id: true, name: true } },
      auditLogs: { include: { actor: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!quotation) throw new AppError(404, 'QUOTATION_NOT_FOUND', 'Quotation not found');
  return quotation;
}

async function create(data, userId) {
  const quotationNumber = await generateNumber(constants.NumberPrefix.QUOTATION, 'quotations', 'quotationNumber');
  const { enquiryId, items, discountPct = 0, gstPct = 18, validUntil } = data;

  const quotation = await prisma.$transaction(async (tx) => {
    const enquiry = await tx.enquiry.findUnique({ where: { id: enquiryId }, include: { items: true } });
    if (!enquiry) throw new AppError(404, 'ENQUIRY_NOT_FOUND', 'Enquiry not found');
    if (enquiry.status === constants.EnquiryStatus.WON || enquiry.status === constants.EnquiryStatus.LOST) {
      throw new AppError(400, 'ENQUIRY_CLOSED', 'Cannot create quotation for a closed enquiry');
    }
    const existing = await tx.quotation.findUnique({ where: { enquiryId } });
    if (existing) throw new AppError(409, 'QUOTATION_EXISTS', 'A quotation already exists for this enquiry');

    const enriched = items.map((it) => {
      const product = enquiry.items.find((e) => e.productId === it.productId);
      if (!product) throw new AppError(400, 'PRODUCT_NOT_IN_ENQUIRY', `Product ${it.productId} is not part of the enquiry`);
      if (it.qty > product.quantity) throw new AppError(400, 'QTY_EXCEEDS_ENQUIRY', `Quantity for product ${it.productId} exceeds enquiry quantity`);
      return { productId: it.productId, qty: it.qty, unitPrice: it.unitPrice };
    });

    const { grandTotal, totals } = calculateQuotationTotals(enriched, Number(discountPct), Number(gstPct));

    const created = await tx.quotation.create({
      data: {
        quotationNumber,
        enquiryId,
        customerId: enquiry.customerId,
        discountPct,
        gstPct,
        grandTotal,
        validUntil: validUntil ? new Date(validUntil) : null,
        status: constants.QuotationStatus.DRAFT,
        createdById: userId,
        items: {
          create: enriched.map((it, i) => ({
            productId: it.productId,
            qty: it.qty,
            unitPrice: it.unitPrice,
            lineAmount: totals[i].lineAmount,
          })),
        },
      },
      include: { customer: true, enquiry: true, items: { include: { product: true } } },
    });

    await tx.enquiry.update({ where: { id: enquiryId }, data: { status: constants.EnquiryStatus.QUOTED } });
    await AuditLog.record(tx, {
      actorId: userId,
      action: 'CREATE',
      entity: 'Quotation',
      entityId: created.id,
      after: { quotationNumber, grandTotal },
    });
    return created;
  });

  return quotation;
}

async function updateStatus(id, status, userId) {
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) throw new AppError(404, 'QUOTATION_NOT_FOUND', 'Quotation not found');
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.quotation.update({ where: { id }, data: { status } });
    await AuditLog.record(tx, {
      actorId: userId,
      action: `STATUS_CHANGE`,
      entity: 'Quotation',
      entityId: id,
      quotationId: id,
      before: { status: quotation.status },
      after: { status },
    });
    if (status === constants.QuotationStatus.REJECTED) {
      await tx.enquiry.update({ where: { id: quotation.enquiryId }, data: { status: constants.EnquiryStatus.LOST } });
    }
    return result;
  });
  return updated;
}

module.exports = { list, getById, create, updateStatus };
