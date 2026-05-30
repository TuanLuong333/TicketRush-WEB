const express = require('express');
const queueController = require('./queue.controller');
const { authenticate, requireCustomer } = require('../auth/auth.middleware');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router({ mergeParams: true });

router.use(authenticate, requireCustomer);

router.post('/join', asyncHandler(queueController.joinQueue));
router.get('/status', asyncHandler(queueController.getQueueStatus));
router.post('/leave', asyncHandler(queueController.leaveQueue));

module.exports = router;
