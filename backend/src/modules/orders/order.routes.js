const express = require('express');
const orderController = require('./order.controller');
const { authenticate, requireCustomer } = require('../auth/auth.middleware');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();

router.use(authenticate, requireCustomer);

router.get('/', asyncHandler(orderController.listOrders));
router.get('/:orderId', asyncHandler(orderController.getOrder));
router.post('/:orderId/confirm-payment', asyncHandler(orderController.confirmPayment));

module.exports = router;
