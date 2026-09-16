function toNumber(value) {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function round2(n) {
  return Math.round((toNumber(n) + Number.EPSILON) * 100) / 100;
}

function normalizeDecimal(value) {
  return Number(toNumber(value).toFixed(2));
}

module.exports = { toNumber, round2, normalizeDecimal };
