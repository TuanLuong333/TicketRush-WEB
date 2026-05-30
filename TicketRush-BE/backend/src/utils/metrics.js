const client = require('prom-client');

// Enable default metrics collection (CPU, Memory usage, Event loop lag, etc.)
client.collectDefaultMetrics({ register: client.register });

// Custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5] // Buckets for response times
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code']
});

// Middleware to track HTTP request metrics
const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime();
  
  // Respond finished listener
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    
    // Normalize path to prevent high-cardinality label explosion (e.g. /api/events/1 -> /api/events/:id)
    let route = req.baseUrl + req.path;
    if (req.route && req.route.path) {
      route = req.baseUrl + req.route.path;
    }
    
    // Track metrics (excluding the /metrics endpoint itself to keep data clean)
    if (route !== '/metrics' && route !== '/health') {
      httpRequestDurationMicroseconds
        .labels(req.method, route, res.statusCode)
        .observe(durationInSeconds);
        
      httpRequestsTotal
        .labels(req.method, route, res.statusCode)
        .inc();
    }
  });
  
  next();
};

// Route handler for exposing metrics endpoint
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint
};
