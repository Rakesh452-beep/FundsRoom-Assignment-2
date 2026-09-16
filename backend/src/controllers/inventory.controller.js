const inventoryService = require('../services/inventory.service');

async function list(_req, res, next) {
  try { const data = await inventoryService.list(); return res.json({ success: true, data }); }
  catch (err) { return next(err); }
}

async function adjust(req, res, next) {
  try {
    const data = await inventoryService.adjust(Number(req.params.productId), req.body.quantity, req.user.id);
    return res.json({ success: true, data });
  } catch (err) { return next(err); }
}

module.exports = { list, adjust };
