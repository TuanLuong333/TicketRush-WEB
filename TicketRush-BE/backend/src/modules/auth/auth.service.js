const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
const env = require('../../config/env');
const { AppError } = require('../../utils/errors');

const VALID_GENDERS = new Set(['MALE', 'FEMALE', 'OTHER']);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function toPublicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    gender: user.gender,
    dateOfBirth: user.date_of_birth,
    phone: user.phone,
    createdAt: user.created_at
  };
}

function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

function ensurePlainObject(payload, message) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError(message, 400);
  }
}

function validateProfileInput({ fullName, email, password, gender }) {
  if (!fullName || String(fullName).trim().length < 2) {
    throw new AppError('Họ tên phải có ít nhất 2 ký tự', 400);
  }

  if (!email || !String(email).includes('@')) {
    throw new AppError('Email không hợp lệ', 400);
  }

  if (!password || String(password).length < 8) {
    throw new AppError('Mật khẩu phải có ít nhất 8 ký tự', 400);
  }

  if (gender && !VALID_GENDERS.has(gender)) {
    throw new AppError('Giới tính không hợp lệ', 400);
  }
}

async function register(payload = {}) {
  ensurePlainObject(payload, 'Dữ liệu đăng ký không hợp lệ');

  const email = normalizeEmail(payload.email);
  const fullName = payload.fullName || payload.full_name;
  const dateOfBirth = payload.dateOfBirth || payload.date_of_birth;
  validateProfileInput({ ...payload, fullName, email });

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length) {
    throw new AppError('Email đã được đăng ký', 409);
  }

  const passwordHash = await bcrypt.hash(String(payload.password), 12);
  const [result] = await pool.query(
    `
    INSERT INTO users (full_name, email, password_hash, role, gender, date_of_birth, phone)
    VALUES (?, ?, ?, 'CUSTOMER', ?, ?, ?)
    `,
    [
      String(fullName).trim(),
      email,
      passwordHash,
      payload.gender || null,
      dateOfBirth || null,
      payload.phone || null
    ]
  );

  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
  const user = rows[0];

  return {
    token: signToken(user),
    user: toPublicUser(user)
  };
}

async function login(payload = {}) {
  ensurePlainObject(payload, 'Dữ liệu đăng nhập không hợp lệ');

  const { email, password } = payload;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    throw new AppError('Email và mật khẩu là bắt buộc', 400);
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
  const user = rows[0];
  if (!user) {
    throw new AppError('Email hoặc mật khẩu không đúng', 401);
  }

  const validPassword = await bcrypt.compare(String(password), user.password_hash);
  if (!validPassword) {
    throw new AppError('Email hoặc mật khẩu không đúng', 401);
  }

  return {
    token: signToken(user),
    user: toPublicUser(user)
  };
}

async function findUserById(userId) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  return rows[0] ? toPublicUser(rows[0]) : null;
}

module.exports = {
  register,
  login,
  findUserById,
  toPublicUser
};
