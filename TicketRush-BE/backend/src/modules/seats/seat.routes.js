const express = require('express');
const seatController = require('./seat.controller');
const { authenticate, requireCustomer } = require('../auth/auth.middleware');
const { requireActiveQueueEntry } = require('../queue/queue.middleware');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();

router.post(
  '/:eventId/lock-seats',
  authenticate,
  requireCustomer,
  asyncHandler(requireActiveQueueEntry),
  asyncHandler(seatController.lockSeats)
);

module.exports = router;
