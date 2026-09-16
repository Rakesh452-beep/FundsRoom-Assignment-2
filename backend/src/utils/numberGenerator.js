const prisma = require('../config/db');

const PREFIXES = {
  ENQ: 'ENQ',
  QT: 'QT',
  SO: 'SO',
  DISP: 'DISP',
};

async function generateNumber(prefix, model, field, client = prisma) {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const key = `${prefix}-${yyyy}${mm}`;

  const result = await client.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "${model}" WHERE "${field}" LIKE '${key}-%'`
  );
  const seq = result[0].count + 1;
  return `${key}-${String(seq).padStart(4, '0')}`;
}

module.exports = { generateNumber, PREFIXES };