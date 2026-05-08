const express = require('express');
const adminController = require('./admin.controller');
const { authenticate, requireAdmin } = require('../auth/auth.middleware');
const { asyncHandler } = require('../../utils/errors');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.post('/events', asyncHandler(adminController.createEvent));
router.put('/events/:eventId', asyncHandler(adminController.updateEvent));
router.delete('/events/:eventId', asyncHandler(adminController.deleteEvent));
router.post('/events/:eventId/publish', asyncHandler(adminController.publishEvent));
router.post('/events/:eventId/zones', asyncHandler(adminController.createZone));
router.get('/events/:eventId/zones', asyncHandler(adminController.listZones));
router.post('/events/:eventId/generate-seats', asyncHandler(adminController.generateSeats));
router.get('/events/:eventId/dashboard', asyncHandler(adminController.getDashboard));
router.get('/events/:eventId/audience-statistics', asyncHandler(adminController.getAudienceStatistics));

module.exports = router;
