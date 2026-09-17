/* Concurrency proof — race two reservations against live Postgres.
 * Scenario: available = 100. Two confirmed-quantity sales orders (80 and 50).
 * Both confirm requests fire SIMULTANEOUSLY. Only one may succeed.
 * DB-level guarantees under test: SELECT ... FOR UPDATE (serialization) +
 * conditional atomic UPDATE + CHECK (reservedQty <= physicalQty).
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');

const suffix = Date.now();
let results = [];
function ok(cond, msg) {
  const tag = cond ? 'PASS' : 'FAIL';
  results.push(`${tag} | ${msg}`);
  console.log(`  [${tag}] ${msg}`);
  return cond;
}

async function main() {
  const login = await request(app).post('/api/auth/login').send({ email: 'admin@erp.com', password: 'admin123' });
  if (login.status !== 200) throw new Error('login failed');
  const token = login.body.data.token;
  const adminId = login.body.data.user.id;

  console.log('Setting up: product + inventory (physical=100, reserved=0)');
  const product = await prisma.product.create({
    data: { code: `T-CONC-${suffix}`, name: 'Concurrency Test Widget', category: 'Test', unit: 'PCS', basePrice: 100 },
  });
  const productId = product.id;
  await prisma.inventory.create({ data: { productId, physicalQty: 100, reservedQty: 0 } });

  const customer = await request(app)
    .post('/api/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ companyName: `Concurrent Buyer ${suffix}`, contactPerson: 'Test', mobile: `9${suffix.toString().slice(-9)}`, city: 'Test City', createdById: adminId });
  if (customer.status !== 201) throw new Error(`customer create failed: ${customer.status}`);
  const customerId = customer.body.data.id;

  async function makeSo(qty, label) {
    const enq = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${token}`)
      .send({ customer: { id: customerId }, items: [{ productId, quantity: qty }], notes: label });
    if (enq.status !== 201) throw new Error(`${label} enquiry: ${enq.status}`);
    const quote = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${token}`)
      .send({ enquiryId: enq.body.data.id, items: [{ productId, qty, unitPrice: 150 }] });
    if (quote.status !== 201) throw new Error(`${label} quote: ${quote.status}`);
    const accepted = await request(app)
      .patch(`/api/quotations/${quote.body.data.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ACCEPTED' });
    if (accepted.status !== 200) throw new Error(`${label} accept: ${accepted.status}`);
    const so = await request(app)
      .post(`/api/quotations/${quote.body.data.id}/convert`)
      .set('Authorization', `Bearer ${token}`);
    if (so.status !== 201) throw new Error(`${label} convert: ${so.status}`);
    return { soId: so.body.data.id, enquiryId: enq.body.data.id, quotationId: quote.body.data.id, qty };
  }

  console.log('Race start: soA(80) and soB(50) confirm launched together...');
  const a = await makeSo(80, 'Concurrent A');
  const b = await makeSo(50, 'Concurrent B');

  const [resA, resB] = await Promise.all([
    request(app).post(`/api/sales-orders/${a.soId}/confirm`).set('Authorization', `Bearer ${token}`),
    request(app).post(`/api/sales-orders/${b.soId}/confirm`).set('Authorization', `Bearer ${token}`),
  ]);

  const statusA = resA.status;
  const statusB = resB.status;
  const codeA = resA.body?.code;
  const codeB = resB.body?.code;

  console.log(`  A(80) -> HTTP ${statusA}${codeA ? ` (${codeA})` : ''}`);
  console.log(`  B(50) -> HTTP ${statusB}${codeB ? ` (${codeB})` : ''}`);

  const wins = [];
  if (statusA === 200) wins.push('A(80)');
  if (statusB === 200) wins.push('B(50)');
  const loser = statusA !== 200 ? resA : resB;
  const loserCode = statusA !== 200 ? codeA : codeB;

  const inv = await prisma.inventory.findUnique({ where: { productId } });
  const reserved = Number(inv.reservedQty);
  const physical = Number(inv.physicalQty);

  const [soArow, soBrow] = await Promise.all([
    prisma.salesOrder.findUnique({ where: { id: a.soId }, select: { status: true } }),
    prisma.salesOrder.findUnique({ where: { id: b.soId }, select: { status: true } }),
  ]);

  console.log(`Final inventory: physical=${physical}, reserved=${reserved}, available=${physical - reserved}`);

  ok(wins.length === 1, 'exactly ONE reservation succeeded');
  ok(loserCode === 'INSUFFICIENT_STOCK', `the other failed with INSUFFICIENT_STOCK (got ${loserCode})`);
  ok(physical - reserved >= 0, 'available never went negative');
  ok(reserved <= 100, 'reserved never exceeded physical (100)');
  const winningQty = wins[0] === 'A(80)' ? a.qty : b.qty;
  ok(reserved === winningQty, `reserved equals the winning order qty exactly (winner ${wins[0]} -> reserved ${reserved})`);
  ok(soArow.status !== soBrow.status, `only winning order CONFIRMED, losing stays PENDING (A=${soArow.status}, B=${soBrow.status})`);
  ok((wins[0] === 'A(80)' ? soArow.status : soBrow.status) === 'CONFIRMED', 'the CONFIRMED order is indeed the winner');
  console.log('Cleanup...');
  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entity: 'SalesOrder', entityId: { in: [a.soId, b.soId] } },
          { entity: 'Quotation', entityId: { in: [a.quotationId, b.quotationId] } },
          { entity: 'Enquiry', entityId: { in: [a.enquiryId, b.enquiryId] } },
        ],
      },
    }),
    prisma.salesOrderItem.deleteMany({ where: { salesOrderId: { in: [a.soId, b.soId] } } }),
    prisma.salesOrder.deleteMany({ where: { id: { in: [a.soId, b.soId] } } }),
    prisma.quotationItem.deleteMany({ where: { quotationId: { in: [a.quotationId, b.quotationId] } } }),
    prisma.quotation.deleteMany({ where: { id: { in: [a.quotationId, b.quotationId] } } }),
    prisma.enquiryItem.deleteMany({ where: { enquiryId: { in: [a.enquiryId, b.enquiryId] } } }),
    prisma.enquiry.deleteMany({ where: { id: { in: [a.enquiryId, b.enquiryId] } } }),
    prisma.customer.deleteMany({ where: { id: customerId } }),
    prisma.product.deleteMany({ where: { id: productId } }),
  ]);
  console.log('Cleanup done.');

  const failed = results.filter((r) => r.startsWith('FAIL'));
  console.log(`\nRESULT: ${failed.length === 0 ? 'ALL CHECKS PASSED ✔' : `${failed.length} CHECK(S) FAILED`}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());