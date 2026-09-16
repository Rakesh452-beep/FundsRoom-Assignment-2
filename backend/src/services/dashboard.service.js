const prisma = require('../config/db');
const constants = require('../config/constants');

async function summary() {
  const [
    enquiries,
    quotations,
    salesOrders,
    dispatches,
    lowStock,
    topProducts,
    revenue,
  ] = await Promise.all([
    prisma.enquiry.count(),
    prisma.quotation.count(),
    prisma.salesOrder.count(),
    prisma.dispatch.count(),
    prisma.inventory.findMany({ include: { product: true } }),
    prisma.salesOrderItem.groupBy({ by: ['productId'], _sum: { qty: true }, orderBy: { _sum: { qty: 'desc' } }, take: 5 }),
    prisma.salesOrder.aggregate({ _sum: { totalAmount: true }, where: { status: { in: [constants.SalesOrderStatus.CONFIRMED, constants.SalesOrderStatus.DISPATCHED] } } }),
  ]);

  const funnel = {
    enquiries,
    quotations,
    won: await prisma.enquiry.count({ where: { status: constants.EnquiryStatus.WON } }),
    salesOrders,
    dispatched: dispatches,
    revenue: Number(revenue._sum.totalAmount || 0),
  };

  const alerts = lowStock
    .filter((inv) => inv.physicalQty - inv.reservedQty <= constants.STOCK_ALERT_THRESHOLD)
    .map((inv) => ({ product: inv.product, physicalQty: inv.physicalQty, reservedQty: inv.reservedQty, availableQty: inv.physicalQty - inv.reservedQty }));

  const products = [];
  for (const row of topProducts) {
    const product = await prisma.product.findUnique({ where: { id: row.productId } });
    products.push({ product, totalQty: row._sum.qty });
  }

  return { funnel, alerts, topProducts: products };
}

module.exports = { summary };
