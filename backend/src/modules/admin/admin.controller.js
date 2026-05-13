const adminService = require('./admin.service');

async function listOrders(req, res) {
  const result = await adminService.listOrders(req.query);
  res.json(result);
}

async function getOrder(req, res) {
  const result = await adminService.getOrder(req.params.orderId);
  res.json(result);
}

async function createEvent(req, res) {
  const event = await adminService.createEvent(req.user.id, req.body);
  res.status(201).json({ event });
}

async function updateEvent(req, res) {
  const event = await adminService.updateEvent(req.params.eventId, req.body);
  res.json({ event });
}

async function deleteEvent(req, res) {
  const result = await adminService.deleteEvent(req.params.eventId);
  res.json(result);
}

async function publishEvent(req, res) {
  const event = await adminService.publishEvent(req.params.eventId);
  res.json({ event });
}

async function createZone(req, res) {
  const zone = await adminService.createZone(req.params.eventId, req.body);
  res.status(201).json({ zone });
}

async function listZones(req, res) {
  const zones = await adminService.listZones(req.params.eventId);
  res.json({ data: zones });
}

async function generateSeats(req, res) {
  const result = await adminService.generateSeats(req.params.eventId);
  res.status(201).json(result);
}

async function getDashboard(req, res) {
  const result = await adminService.getDashboard(req.params.eventId);
  res.json(result);
}

async function getAudienceStatistics(req, res) {
  const result = await adminService.getAudienceStatistics(req.params.eventId);
  res.json(result);
}

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  createZone,
  listZones,
  generateSeats,
  getDashboard,
  getAudienceStatistics,
  listOrders,
  getOrder
};
