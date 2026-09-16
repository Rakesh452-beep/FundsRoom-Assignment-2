const { PrismaClient } = require('@prisma/client');
const env = require('./env');

let url = env.databaseUrl;
if (env.nodeEnv === 'test' && env.testDatabaseUrl) {
  url = env.testDatabaseUrl;
}

const prisma = new PrismaClient({
  datasources: { db: { url } },
  log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
