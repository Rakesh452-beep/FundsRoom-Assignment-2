const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const adminPassword = await bcrypt.hash('admin123', rounds);
  const salesPassword = await bcrypt.hash('sales123', rounds);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: {},
    create: { email: 'admin@erp.com', passwordHash: adminPassword, name: 'Admin User', role: 'ADMIN' },
  });
  const sales = await prisma.user.upsert({
    where: { email: 'sales@erp.com' },
    update: {},
    create: { email: 'sales@erp.com', passwordHash: salesPassword, name: 'Sales User', role: 'SALES_USER' },
  });

  const products = [
    { code: 'RM-001', name: 'Cold Rolled Steel Coil', category: 'Raw Material', unit: 'MT', basePrice: 58000 },
    { code: 'RM-002', name: 'Aluminium Ingot', category: 'Raw Material', unit: 'KG', basePrice: 220 },
    { code: 'RM-003', name: 'Industrial Bearings', category: 'Component', unit: 'PCS', basePrice: 1450 },
    { code: 'RM-004', name: 'Hydraulic Pump', category: 'Component', unit: 'PCS', basePrice: 9800 },
    { code: 'RM-005', name: 'Stainless Steel Pipe', category: 'Raw Material', unit: 'MTR', basePrice: 420 },
    { code: 'RM-006', name: 'Conveyor Belt', category: 'Component', unit: 'MTR', basePrice: 2750 },
  ];

  const units = {
    'RM-001': 120,
    'RM-002': 2000,
    'RM-003': 400,
    'RM-004': 150,
    'RM-005': 1000,
    'RM-006': 300,
  };

  const created = [];
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
    created.push(product);
    const physicalQty = units[p.code] || 500;
    const inv = await prisma.inventory.findUnique({ where: { productId: product.id } });
    if (inv) {
      await prisma.inventory.update({
        where: { productId: product.id },
        data: { physicalQty: inv.physicalQty === 0 ? physicalQty : inv.physicalQty, reservedQty: inv.reservedQty },
      });
    } else {
      await prisma.inventory.create({ data: { productId: product.id, physicalQty, reservedQty: 0 } });
    }
  }

  const customer = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      companyName: 'Zenith Engineering Pvt Ltd',
      contactPerson: 'Rahul Sharma',
      mobile: '9876543210',
      email: 'rahul@zenith.co.in',
      city: 'Pune',
      createdById: admin.id,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      companyName: 'Orbit Fabricators',
      contactPerson: 'Meena Iyer',
      mobile: '9123456780',
      email: 'meena@orbitfab.com',
      city: 'Mumbai',
      createdById: sales.id,
    },
  });

  console.log(`Seeded: users ${admin.email} / ${sales.email}`);
  console.log(`Seeded: ${created.length} products, customers: ${customer.companyName}, ${customer2.companyName}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
