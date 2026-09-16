const env = require('../config/env');

function errorHandler(err, _req, res, _next) {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, code: 'INVALID_JSON', message: 'Malformed JSON body' });
  }

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Something went wrong';

  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  if (status >= 500 && env.nodeEnv === 'production') {
    return res.status(status).json({ success: false, code, message: 'Internal server error' });
  }

  return res.status(status).json({ success: false, code, message });
}

module.exports = errorHandler;
