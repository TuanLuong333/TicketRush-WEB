const env = require('../../config/env');
const queueService = require('./queue.service');
const { AppError } = require('../../utils/errors');

async function requireActiveQueueEntry(req, res, next) {
  try {
    if (!env.queue.enabled) {
      next();
      return;
    }

    const status = await queueService.getQueueStatus(req.user.id, req.params.eventId);
    if (status.status === 'ACTIVE' && status.canEnter) {
      next();
      return;
    }

    next(new AppError('Bạn đang ở phòng chờ', 403, {
      queueRequired: true,
      queue: status
    }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requireActiveQueueEntry
};
