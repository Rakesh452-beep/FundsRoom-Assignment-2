const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const bcrypt = require('bcryptjs');

let adminToken;
let salesToken;
let adminId;
let enquiry1;
let quotation1;
let quotation2;

async function createUser(email, name, role) {
  const hash = await bcrypt.hash('password123', 10);
  return prisma.user.create({ data: { email, passwordHash: hash, name, role } });
}

async function createCustomer(name) {
  return prisma.customer.create({
    data: { companyName: name, contactPerson: 'Test Person', mobile: '9999999999', email: `${name}@test.com`, city: 'Test City', createdById: adminId },
  });
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

  const admin = await createUser('admin.test@erp.com', 'Admin Tester', 'ADMIN');
  const sales = await createUser('sales.test@erp.com', 'Sales Tester', 'SALES_USER');
  adminId = admin.id;

  adminToken = await login('admin.test@erp.com', 'password123');
  salesToken = await login('sales.test@erp.com', 'password123');

  const p1 = await prisma.product.create({ data: { code: 'T-001', name: 'Test Steel Coil', category: 'Raw Material', unit: 'MT', basePrice: 50000 } });
  const p2 = await prisma.product.create({ data: { code: 'T-002', name: 'Test Aluminium', category: 'Raw Material', unit: 'KG', basePrice: 200 } });
  await prisma.inventory.createMany({ data: [{ productId: p1.id, physicalQty: 100, reservedQty: 0 }, { productId: p2.id, physicalQty: 50, reservedQty: 0 }] });

  const customer = await createCustomer('Test Corp');

  const enq = await request(app)
    .post('/api/enquiries')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      customer: { id: customer.id },
      items: [{ productId: p1.id, quantity: 20 }, { productId: p2.id, quantity: 30 }],
      notes: 'test enquiry',
    });
  enquiry1 = enq.body.data;

  const quote1 = await request(app)
    .post('/api/quotations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      enquiryId: enquiry1.id,
      items: [{ productId: p1.id, qty: 20, unitPrice: 55000 }, { productId: p2.id, qty: 30, unitPrice: 210 }],
      discountPct: 5,
      gstPct: 18,
    });
  quotation1 = quote1.body.data;

  const enq2 = await request(app)
    .post('/api/enquiries')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ customer: { id: customer.id }, items: [{ productId: p1.id, quantity: 10 }] });
  const quote2Enq = enq2.body.data;

  const quote2 = await request(app)
    .post('/api/quotations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ enquiryId: quote2Enq.id, items: [{ productId: p1.id, qty: 10, unitPrice: 55000 }] });
  quotation2 = quote2.body.data;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('ERP business rules', () => {
  test('Test #1: Quotation total is calculated on backend, not client', async () => {
    const line1 = 20 * 55000;
    const net1 = line1 * (1 - 0.05);
    const total1 = net1 * 1.18;
    const line2 = 30 * 210;
    const net2 = line2 * (1 - 0.05);
    const total2 = net2 * 1.18;
    const expected = Math.round((total1 + total2) * 100) / 100;
    expect(Number(quotation1.grandTotal)).toBeCloseTo(expected, 2);
  });

  test('Test #2: Draft/Rejected quotation cannot create a sales order', async () => {
    const draftConvert = await request(app).post(`/api/quotations/${quotation1.id}/convert`).set('Authorization', `Bearer ${adminToken}`);
    expect(draftConvert.status).toBe(400);
    await request(app).patch(`/api/quotations/${quotation2.id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'REJECTED' });
    const rejConvert = await request(app).post(`/api/quotations/${quotation2.id}/convert`).set('Authorization', `Bearer ${adminToken}`);
    expect(rejConvert.status).toBe(400);
  });

  test('Test #3: Same quotation cannot create duplicate sales order', async () => {
    const accept = await request(app).patch(`/api/quotations/${quotation1.id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'ACCEPTED' });
    expect(accept.status).toBe(200);
    const first = await request(app).post(`/api/quotations/${quotation1.id}/convert`).set('Authorization', `Bearer ${adminToken}`);
    expect(first.status).toBe(201);
    const dup = await request(app).post(`/api/quotations/${quotation1.id}/convert`).set('Authorization', `Bearer ${adminToken}`);
    expect(dup.status).toBe(409);
  });

  test('Test #4: Cannot reserve more than available inventory', async () => {
    const p = await prisma.product.create({ data: { code: 'T-004', name: 'Scarce Widget', category: 'Component', unit: 'PCS', basePrice: 100 } });
    await prisma.inventory.create({ data: { productId: p.id, physicalQty: 10, reservedQty: 0 } });
    const customer = await createCustomer('Reserve Corp');

    const enq = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer: { id: customer.id }, items: [{ productId: p.id, quantity: 20 }] });
    expect(enq.status).toBe(201);

    const quote = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enquiryId: enq.body.data.id, items: [{ productId: p.id, qty: 20, unitPrice: 120 }] });
    expect(quote.status).toBe(201);

    await request(app)
      .patch(`/api/quotations/${quote.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACCEPTED' });

    const so = await request(app)
      .post(`/api/quotations/${quote.body.data.id}/convert`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(so.status).toBe(201);

    const confirm = await request(app)
      .post(`/api/sales-orders/${so.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(confirm.status).toBe(400);
    expect(confirm.body.code).toBe('INSUFFICIENT_STOCK');
  });

  test('Test #5: Unauthorized user cannot perform restricted operations', async () => {
    const res = await request(app).post('/api/sales-orders/1/confirm').set('Authorization', `Bearer ${salesToken}`).send();
    expect(res.status).toBe(403);
    const noToken = await request(app).get('/api/quotations');
    expect(noToken.status).toBe(401);
  });

  test('Test #6 (bonus): Concurrent reservations cannot over-reserve inventory', async () => {
    const p = await prisma.product.create({ data: { code: 'T-003', name: 'Concurrency Widget', category: 'Component', unit: 'PCS', basePrice: 100 } });
    await prisma.inventory.create({ data: { productId: p.id, physicalQty: 100, reservedQty: 0 } });
    const customer = await createCustomer('Concurrent Buyer');

    async function makeSo(qty, name) {
      const enq = await request(app)
        .post('/api/enquiries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customer: { id: customer.id }, items: [{ productId: p.id, quantity: qty }], notes: name });
      const quote = await request(app)
        .post('/api/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enquiryId: enq.body.data.id, items: [{ productId: p.id, qty, unitPrice: 150 }] });
      const accepted = await request(app)
        .patch(`/api/quotations/${quote.body.data.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACCEPTED' });
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

    const inv = await prisma.inventory.findUnique({ where: { productId: p.id } });
    expect(inv.reservedQty).toBeLessThanOrEqual(100);
    expect(inv.physicalQty - inv.reservedQty).toBeGreaterThanOrEqual(0);
  });
});
