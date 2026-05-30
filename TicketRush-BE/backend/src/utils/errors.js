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

function statusFromError(err) {
  const status = err.statusCode || err.status;
  return Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
}

function messageFromError(err, statusCode, isOperational) {
  if (isOperational) return err.message;

  if (err.type === 'entity.parse.failed') {
    return 'JSON body không hợp lệ';
  }

  if (err.type === 'entity.too.large') {
    return 'Dữ liệu gửi lên quá lớn';
  }

  if (statusCode >= 400 && statusCode < 500 && err.expose) {
    return err.message || 'Yêu cầu không hợp lệ';
  }

  if (process.env.NODE_ENV !== 'production' && err.message) {
    return err.message;
  }

  return 'Lỗi hệ thống';
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : statusFromError(err);

  if (!isOperational || statusCode >= 500) {
    console.error(
      `[errorHandler] ${req.method} ${req.originalUrl} -> ${statusCode}`,
      err && err.stack ? err.stack : err
    );
  }

  const payload = {
    message: messageFromError(err, statusCode, isOperational)
  };

  if (err.details) payload.details = err.details;
  if (process.env.NODE_ENV !== 'production' && !isOperational) {
    payload.error = err.message;
    if (err.code) payload.code = err.code;
    if (err.sqlMessage) payload.sqlMessage = err.sqlMessage;
    if (err.sql) payload.sql = err.sql;
    if (err.stack) payload.stack = err.stack.split('\n').slice(0, 6);
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  AppError,
  asyncHandler,
  notFound,
  errorHandler
};
