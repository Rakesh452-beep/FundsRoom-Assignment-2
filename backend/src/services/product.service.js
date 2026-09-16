const prisma = require('../config/db');

async function list() {
  return prisma.product.findMany({
    orderBy: { code: 'asc' },
    include: { inventory: true },
  });
}

module.exports = { list };
