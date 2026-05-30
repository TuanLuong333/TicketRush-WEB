const cron = require('node-cron');
const { releaseExpiredLocks } = require('../modules/orders/order.service');

function startReleaseExpiredSeatsJob() {
  return cron.schedule('* * * * *', async () => {
    try {
      await releaseExpiredLocks();
    } catch (err) {
      console.error('Failed to release expired seat locks', err.message);
    }
  });
}

module.exports = {
  startReleaseExpiredSeatsJob
};
