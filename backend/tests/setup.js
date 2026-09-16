const prisma = require('../src/config/db');

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must run with NODE_ENV=test');
  }
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
