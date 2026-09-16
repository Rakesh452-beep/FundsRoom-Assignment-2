const quotationService = require('../services/quotation.service');
const pdfService = require('../services/pdf.service');

async function list(req, res, next) {
  try {
    const data = await quotationService.list({
      status: req.query.status,
      page: parseInt(req.query.page, 10) || 1,
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 100),
    });
    return res.json({ success: true, data });
  } catch (err) { return next(err); }
}

async function getById(req, res, next) {
  try { const data = await quotationService.getById(Number(req.params.id)); return res.json({ success: true, data }); }
  catch (err) { return next(err); }
}

async function create(req, res, next) {
  try { const data = await quotationService.create(req.body, req.user.id); return res.status(201).json({ success: true, data, grandTotal: data.grandTotal }); }
  catch (err) { return next(err); }
}

async function updateStatus(req, res, next) {
  try { const data = await quotationService.updateStatus(Number(req.params.id), req.body.status, req.user.id); return res.json({ success: true, data }); }
  catch (err) { return next(err); }
}

async function convert(req, res, next) {
  try {
    const salesOrderService = require('../services/salesOrder.service');
    const data = await salesOrderService.convertFromQuotation(Number(req.params.id), req.user.id);
    return res.status(201).json({ success: true, data });
  } catch (err) { return next(err); }
}

async function pdf(req, res, next) {
  try {
    const quotation = await quotationService.getById(Number(req.params.id));
    const buffer = await pdfService.buildInvoicePDF(quotation);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${quotation.quotationNumber}.pdf`);
    return res.send(buffer);
  } catch (err) { return next(err); }
}

module.exports = { list, getById, create, updateStatus, convert, pdf };
