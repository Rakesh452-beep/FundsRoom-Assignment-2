const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/db');

async function start() {
  try {
    await prisma.$connect();
    console.log('[DB] connected');
    app.listen(env.port, () => {
      console.log(`[SERVER] ERP API running on http://localhost:${env.port} (${env.nodeEnv})`);
    });
  } catch (err) {
    console.error('[SERVER] failed to start', err);
    process.exit(1);
  }
}

start();
