const { normalizeDecimal } = require('./money');

function lineTotals(qty, unitPrice, discountPct, gstPct) {
  const lineAmount = normalizeDecimal(qty * unitPrice);
  const netAmount = normalizeDecimal(lineAmount * (1 - discountPct / 100));
  const total = normalizeDecimal(netAmount * (1 + gstPct / 100));
  return { lineAmount, netAmount, total };
}

function calculateQuotationTotals(items, discountPct, gstPct) {
  let grandTotal = 0;
  const totals = items.map((it) => {
    const t = lineTotals(it.qty, it.unitPrice, discountPct, gstPct);
    grandTotal = normalizeDecimal(grandTotal + t.total);
    return t;
  });
  return { grandTotal, totals };
}

module.exports = { lineTotals, calculateQuotationTotals };
