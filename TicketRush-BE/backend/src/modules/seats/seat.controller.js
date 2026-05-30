const seatService = require('./seat.service');

async function lockSeats(req, res) {
  const result = await seatService.lockSeats(req.user.id, req.params.eventId, req.body && req.body.seatIds);
  res.status(201).json(result);
}

module.exports = {
  lockSeats
};
