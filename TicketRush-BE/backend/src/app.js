const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { errorHandler, notFound } = require('./utils/errors');
const { metricsMiddleware, metricsEndpoint } = require('./utils/metrics');
const authRoutes = require('./modules/auth/auth.routes');
const eventRoutes = require('./modules/events/event.routes');
const seatRoutes = require('./modules/seats/seat.routes');
const orderRoutes = require('./modules/orders/order.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

// Register Prometheus metrics middleware at the top of the stack
app.use(metricsMiddleware);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Expose metrics endpoint for Prometheus scraping
app.get('/metrics', metricsEndpoint);

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/customer/events', seatRoutes);
app.use('/api/customer/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

