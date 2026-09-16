const dispatchService = require('../services/dispatch.service');

async function list(req, res, next) {
  try {
    const data = await dispatchService.list({
      page: parseInt(req.query.page, 10) || 1,
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 100),
    });
    return res.json({ success: true, data });
  } catch (err) { return next(err); }
}

module.exports = { list };
