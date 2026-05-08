class AppError extends Error {
  constructor(message, statusCode = 400, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function notFound(req, res, next) {
  next(new AppError(`Không tìm thấy endpoint ${req.method} ${req.originalUrl}`, 404));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;
  const payload = {
    message: isOperational ? err.message : 'Lỗi hệ thống'
  };

  if (err.details) payload.details = err.details;
  if (process.env.NODE_ENV !== 'production' && !isOperational) {
    payload.error = err.message;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  AppError,
  asyncHandler,
  notFound,
  errorHandler
};
