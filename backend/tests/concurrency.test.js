const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const bcrypt = require('bcryptjs');

let adminToken;
let adminId;

async function createUser(email, name, role) {
  const hash = await bcrypt.hash('password123', 10);
  return prisma.user.create({ data: { email, passwordHash: hash, name, role } });
}

async function login(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.token;
}

beforeAll(async () => {
  await prisma.$transaction([
    prisma.dispatchItem.deleteMany(),
    prisma.dispatch.deleteMany(),
    prisma.salesOrderItem.deleteMany(),
    prisma.salesOrder.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.enquiryItem.deleteMany(),
    prisma.enquiry.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.product.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const admin = await createUser('admin.concurrency@erp.com', 'Concurrency Admin', 'ADMIN');
  adminId = admin.id;
  adminToken = await login('admin.concurrency@erp.com', 'password123');

  await prisma.product.create({ data: { code: 'T-003', name: 'Concurrency Widget', category: 'Component', unit: 'PCS', basePrice: 100 } });
  await prisma.inventory.create({ data: { productId: (await prisma.product.findUniqueOrThrow({ where: { code: 'T-003' } })).id, physicalQty: 100, reservedQty: 0 } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Concurrent inventory reservations', () => {
  test('Bonus: simultaneous reservations cannot over-reserve inventory', async () => {
    const p = await prisma.product.findUniqueOrThrow({ where: { code: 'T-003' } });
    const customer = await prisma.customer.create({
      data: { companyName: 'Concurrent Buyer', contactPerson: 'Test Person', mobile: '9999999999', email: 'concurrent@test.com', city: 'Test City', createdById: adminId },
    });

    async function makeSo(qty, name) {
      const enq = await request(app)
        .post('/api/enquiries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customer: { id: customer.id }, items: [{ productId: p.id, quantity: qty }], notes: name });
      expect(enq.status).toBe(201);

      const quote = await request(app)
        .post('/api/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enquiryId: enq.body.data.id, items: [{ productId: p.id, qty, unitPrice: 150 }] });
      expect(quote.status).toBe(201);

      const accepted = await request(app)
        .patch(`/api/quotations/${quote.body.data.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACCEPTED' });
      expect(accepted.status).toBe(200);

      const so = await request(app)
        .post(`/api/quotations/${quote.body.data.id}/convert`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(so.status).toBe(201);
      return so.body.data.id;
    }

    const soA = await makeSo(80, 'Concurrent A');
    const soB = await makeSo(50, 'Concurrent B');

    const [resA, resB] = await Promise.all([
      request(app).post(`/api/sales-orders/${soA}/confirm`).set('Authorization', `Bearer ${adminToken}`),
      request(app).post(`/api/sales-orders/${soB}/confirm`).set('Authorization', `Bearer ${adminToken}`),
    ]);

    const okCount = [resA, resB].filter((r) => r.status === 200).length;
    const failCount = [resA, resB].filter((r) => r.status === 400).length;
    expect(okCount).toBe(1);
    expect(failCount).toBe(1);

    const failed = [resA, resB].find((r) => r.status === 400);
    expect(failed.body.code).toBe('INSUFFICIENT_STOCK');

    const inv = await prisma.inventory.findUnique({ where: { productId: p.id } });
    expect(inv.reservedQty).toBeLessThanOrEqual(100);
    expect(inv.physicalQty - inv.reservedQty).toBeGreaterThanOrEqual(0);
  });
});