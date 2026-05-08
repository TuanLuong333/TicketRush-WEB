const queueService = require('./queue.service');

async function joinQueue(req, res) {
  const result = await queueService.joinQueue(req.user.id, req.params.eventId);
  res.status(201).json(result);
}

async function getQueueStatus(req, res) {
  const result = await queueService.getQueueStatus(req.user.id, req.params.eventId);
  res.json(result);
}

async function leaveQueue(req, res) {
  const result = await queueService.leaveQueue(req.user.id, req.params.eventId);
  res.json(result);
}

module.exports = {
  joinQueue,
  getQueueStatus,
  leaveQueue
};
