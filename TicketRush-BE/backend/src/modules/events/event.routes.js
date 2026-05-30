const express = require('express');
const eventController = require('./event.controller');
const queueRoutes = require('../queue/queue.routes');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();

router.get('/', asyncHandler(eventController.listEvents));
router.get('/:eventId/seat-map', asyncHandler(eventController.getSeatMap));
router.use('/:eventId/queue', queueRoutes);
router.get('/:eventId', asyncHandler(eventController.getEvent));

module.exports = router;
