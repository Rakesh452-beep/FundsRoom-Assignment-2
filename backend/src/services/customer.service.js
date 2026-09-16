const prisma = require('../config/db');
const AppError = require('../utils/AppError');

async function list() {
  return prisma.customer.findMany({ orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { id: true, name: true } } } });
}

async function getById(id) {
  const customer = await prisma.customer.findUnique({ where: { id }, include: { enquiries: { include: { quotation: true } } } });
  if (!customer) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  return customer;
}

async function create(data, userId) {
  return prisma.customer.create({
    data: {
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      mobile: data.mobile,
      email: data.email || null,
      city: data.city || null,
      createdById: userId,
    },
  });
}

module.exports = { list, getById, create };
