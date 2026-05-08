const express = require('express');
const authController = require('./auth.controller');
const { authenticate } = require('./auth.middleware');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/me', authenticate, asyncHandler(authController.me));

module.exports = router;
