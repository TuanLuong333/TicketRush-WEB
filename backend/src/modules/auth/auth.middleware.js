const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
const env = require('../../config/env');
const { AppError } = require('../../utils/errors');
const { toPublicUser } = require('./auth.service');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Bạn cần đăng nhập', 401);
    }

    const payload = jwt.verify(token, env.jwt.secret);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [payload.sub]);
    if (!rows.length) {
      throw new AppError('Tài khoản không còn tồn tại', 401);
    }

    req.user = toPublicUser(rows[0]);
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401));
      return;
    }

    next(err);
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      next(new AppError('Bạn không có quyền thực hiện thao tác này', 403));
      return;
    }

    next();
  };
}

const requireAdmin = requireRole('ADMIN');
const requireCustomer = requireRole('CUSTOMER');

module.exports = {
  authenticate,
  requireAdmin,
  requireCustomer
};
