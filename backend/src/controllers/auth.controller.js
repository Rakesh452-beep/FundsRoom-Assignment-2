const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body.email, req.body.password);
    return res.json({ success: true, data });
  } catch (err) { return next(err); }
}

async function me(req, res, next) {
  try {
    return res.json({ success: true, data: req.user });
  } catch (err) { return next(err); }
}

module.exports = { login, me };
