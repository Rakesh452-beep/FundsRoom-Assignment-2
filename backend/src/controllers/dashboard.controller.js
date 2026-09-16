const dashboardService = require('../services/dashboard.service');

async function summary(_req, res, next) {
  try { const data = await dashboardService.summary(); return res.json({ success: true, data }); }
  catch (err) { return next(err); }
}

module.exports = { summary };
