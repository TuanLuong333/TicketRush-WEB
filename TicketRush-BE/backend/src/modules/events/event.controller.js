const eventService = require('./event.service');

async function listEvents(req, res) {
  const result = await eventService.listEvents(req.query);
  res.json(result);
}

async function getEvent(req, res) {
  const result = await eventService.getEventById(req.params.eventId);
  res.json(result);
}

async function getSeatMap(req, res) {
  const result = await eventService.getSeatMap(req.params.eventId);
  res.json(result);
}

module.exports = {
  listEvents,
  getEvent,
  getSeatMap
};
