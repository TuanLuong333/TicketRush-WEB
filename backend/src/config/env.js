const dotenv = require('dotenv');

dotenv.config();

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 4000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: toInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ticket_rush',
    connectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10)
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  lockDurationMinutes: toInt(process.env.LOCK_DURATION_MINUTES, 10),
  queue: {
    enabled: toBool(process.env.QUEUE_ENABLED, false),
    activeBatchSize: toInt(process.env.QUEUE_ACTIVE_BATCH_SIZE, 50),
    activeMinutes: toInt(process.env.QUEUE_ACTIVE_MINUTES, 10)
  },
  adminSeed: {
    fullName: process.env.ADMIN_FULL_NAME || 'TicketRush Admin',
    email: process.env.ADMIN_EMAIL || 'admin@ticketrush.local',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456'
  }
};

module.exports = env;
