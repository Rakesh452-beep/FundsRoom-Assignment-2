const prisma = require('../config/db');
const AppError = require('../utils/AppError');
const { generateNumber } = require('../utils/numberGenerator');
const constants = require('../config/constants');

async function list({ status, search, page = 1, limit = 20 }) {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { enquiryNumber: { contains: search, mode: 'insensitive' } },
      { customer: { companyName: { contains: search, mode: 'insensitive' } } },
    ];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      include: { customer: true, items: { include: { product: true } }, quotation: { select: { id: true, quotationNumber: true, status: true } }, createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.enquiry.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getById(id) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } }, quotation: { include: { items: { include: { product: true } } } }, createdBy: { select: { id: true, name: true } } },
  });
  if (!enquiry) throw new AppError(404, 'ENQUIRY_NOT_FOUND', 'Enquiry not found');
  return enquiry;
}

async function create(data, userId) {
  const enquiryNumber = await generateNumber(constants.NumberPrefix.ENQUIRY, 'enquiries', 'enquiryNumber');
  const { customer, items, enquiryDate, requiredDate, notes } = data;
  const enquiry = await prisma.$transaction(async (tx) => {
    let customerId = customer.id;
    if (!customer.id) {
      const created = await tx.customer.create({
        data: {
          companyName: customer.companyName,
          contactPerson: customer.contactPerson,
          mobile: customer.mobile,
          email: customer.email || null,
          city: customer.city || null,
          createdById: userId,
        },
      });
      customerId = created.id;
    }
    return tx.enquiry.create({
      data: {
        enquiryNumber,
        customerId,
        enquiryDate: enquiryDate ? new Date(enquiryDate) : new Date(),
        requiredDate: requiredDate ? new Date(requiredDate) : null,
        notes: notes || null,
        status: constants.EnquiryStatus.NEW,
        createdById: userId,
        items: {
          create: items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
        },
      },
      include: { customer: true, items: { include: { product: true } } },
    });
  });
  return enquiry;
}

async function updateStatus(id, status, userId) {
  const enquiry = await prisma.enquiry.findUnique({ where: { id } });
  if (!enquiry) throw new AppError(404, 'ENQUIRY_NOT_FOUND', 'Enquiry not found');
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.enquiry.update({ where: { id }, data: { status } });
    const old = enquiry.status;
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: `STATUS_CHANGE`,
        entity: 'Enquiry',
        entityId: id,
        before: { status: old },
        after: { status },
      },
    });
    return result;
  });
  return updated;
}

module.exports = { list, getById, create, updateStatus };
