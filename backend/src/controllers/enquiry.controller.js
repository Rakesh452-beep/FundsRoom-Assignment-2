const enquiryService = require('../services/enquiry.service');

async function list(req, res, next) {
  try {
    const data = await enquiryService.list({
      status: req.query.status,
      search: req.query.search,
      page: parseInt(req.query.page, 10) || 1,
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 100),
    });
    return res.json({ success: true, data });
  } catch (err) { return next(err); }
}

async function getById(req, res, next) {
  try { const data = await enquiryService.getById(Number(req.params.id)); return res.json({ success: true, data }); }
  catch (err) { return next(err); }
}

async function create(req, res, next) {
  try { const data = await enquiryService.create(req.body, req.user.id); return res.status(201).json({ success: true, data }); }
  catch (err) { return next(err); }
}

async function updateStatus(req, res, next) {
  try { const data = await enquiryService.updateStatus(Number(req.params.id), req.body.status, req.user.id); return res.json({ success: true, data }); }
  catch (err) { return next(err); }
}

module.exports = { list, getById, create, updateStatus };
