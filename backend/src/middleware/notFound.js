const AppError = require('../utils/AppError');

function notFound(_req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}

module.exports = notFound;
