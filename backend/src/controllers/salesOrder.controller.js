const salesOrderService = require('../services/salesOrder.service');

async function list(req, res, next) {
  try {
    const data = await salesOrderService.list({
      status: req.query.status,
      page: parseInt(req.query.page, 10) || 1,
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 100),
    });
    return res.json({ success: true, data });
  } catch (err) { return next(err); }
}

async function getById(req, res, next) {
  try { const data = await salesOrderService.getById(Number(req.params.id)); return res.json({ success: true, data }); }
  catch (err) { return next(err); }
}

async function convert(req, res, next) {
  try { const data = await salesOrderService.convertFromQuotation(Number(req.params.id), req.user.id); return res.status(201).json({ success: true, data }); }
  catch (err) { return next(err); }
}

async function confirm(req, res, next) {
  try { const data = await salesOrderService.confirm(Number(req.params.id), req.user.id); return res.json({ success: true, data }); }
  catch (err) { return next(err); }
}

async function dispatch(req, res, next) {
  try { const data = await salesOrderService.dispatch(Number(req.params.id), req.body, req.user.id); return res.status(201).json({ success: true, data }); }
  catch (err) { return next(err); }
}

async function cancel(req, res, next) {
  try { const data = await salesOrderService.cancel(Number(req.params.id), req.user.id); return res.json({ success: true, data }); }
  catch (err) { return next(err); }
}

module.exports = { list, getById, convert, confirm, dispatch, cancel };
