const cron = require('node-cron');
const env = require('../config/env');
const { activateQueues } = require('../modules/queue/queue.service');

function startActivateQueueJob() {
  if (!env.queue.enabled) return null;

  return cron.schedule('* * * * *', async () => {
    try {
      await activateQueues();
    } catch (err) {
      console.error('Failed to activate queue entries', err.message);
    }
  });
}

module.exports = {
  startActivateQueueJob
};
