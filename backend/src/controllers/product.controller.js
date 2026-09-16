const productService = require('../services/product.service');

async function list(_req, res, next) {
  try { const data = await productService.list(); return res.json({ success: true, data }); }
  catch (err) { return next(err); }
}

module.exports = { list };
