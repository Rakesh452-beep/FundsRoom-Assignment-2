const customerService = require('../services/customer.service');

async function list(req, res, next) {
  try {
    const data = await customerService.list();
    return res.json({ success: true, data });
  } catch (err) { return next(err); }
}

async function getById(req, res, next) {
  try { const data = await customerService.getById(Number(req.params.id)); return res.json({ success: true, data }); }
  catch (err) { return next(err); }
}

async function create(req, res, next) {
  try { const data = await customerService.create(req.body, req.user.id); return res.status(201).json({ success: true, data }); }
  catch (err) { return next(err); }
}

module.exports = { list, getById, create };
