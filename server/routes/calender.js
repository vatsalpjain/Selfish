import express from 'express';
import protect from '../middleware/auth.js';

import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  getCalendarEvents,
  getConnectionStatus,
  disconnectCalendar,
  addEvent,
  updateEvent,
  deleteEvent
} from '../controllers/calenderController.js';

const router = express.Router();

// Auth routes
router.get('/auth/google', protect, getGoogleAuthUrl);
router.get('/auth/google/callback', handleGoogleCallback);

// Calendar routes
router.get('/status', protect, getConnectionStatus);
router.get('/events', protect, getCalendarEvents);
router.delete('/disconnect', protect, disconnectCalendar);
router.post('/addEvent', protect, addEvent);
router.put('/updateEvent', protect, updateEvent);
router.delete('/deleteEvent', protect, deleteEvent);

export default router;