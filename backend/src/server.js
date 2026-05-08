const app = require('./app');
const env = require('./config/env');
const pool = require('./config/database');
const { startReleaseExpiredSeatsJob } = require('./jobs/releaseExpiredSeats.job');
const { startActivateQueueJob } = require('./jobs/activateQueue.job');

async function start() {
  await pool.query('SELECT 1');

  app.listen(env.port, () => {
    console.log(`TicketRush backend listening on port ${env.port}`);
  });

  startReleaseExpiredSeatsJob();
  startActivateQueueJob();
}

start().catch((err) => {
  console.error('Failed to start backend', err);
  process.exit(1);
});
