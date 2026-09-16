const prisma = require('../config/db');
const AppError = require('../utils/AppError');
const constants = require('../config/constants');

async function list() {
  const items = await prisma.inventory.findMany({
    include: { product: true },
    orderBy: { productId: 'asc' },
  });
  return items.map((inv) => ({
    id: inv.id,
    productId: inv.productId,
    product: inv.product,
    physicalQty: inv.physicalQty,
    reservedQty: inv.reservedQty,
    availableQty: inv.physicalQty - inv.reservedQty,
    lowStock: inv.physicalQty - inv.reservedQty <= constants.STOCK_ALERT_THRESHOLD,
  }));
}

async function adjust(productId, physicalDelta, userId) {
  return prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUnique({
      where: { productId },
      include: { product: true },
    });
    if (!inventory) throw new AppError(404, 'INVENTORY_NOT_FOUND', 'Inventory record not found');
    const before = { physicalQty: inventory.physicalQty, reservedQty: inventory.reservedQty };
    const newPhysical = inventory.physicalQty + physicalDelta;
    if (newPhysical < 0) {
      throw new AppError(400, 'INVALID_INVENTORY_UPDATE', 'Invalid inventory updates');
    }
    if (newPhysical < inventory.reservedQty) {
      throw new AppError(400, 'INVALID_INVENTORY_UPDATE', 'Cannot reduce physical below reserved quantity');
    }
    const updated = await tx.inventory.update({
      where: { productId },
      data: { physicalQty: newPhysical },
      include: { product: true },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: 'INVENTORY_ADJUST',
        entity: 'Inventory',
        entityId: inventory.id,
        before,
        after: { physicalQty: updated.physicalQty, reservedQty: updated.reservedQty },
      },
    });
    return {
      id: updated.id,
      productId: updated.productId,
      product: updated.product,
      physicalQty: updated.physicalQty,
      reservedQty: updated.reservedQty,
      availableQty: updated.physicalQty - updated.reservedQty,
    };
  });
}

module.exports = { list, adjust };
