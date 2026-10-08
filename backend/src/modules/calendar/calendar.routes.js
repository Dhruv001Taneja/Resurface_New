import express from 'express';
import { getEvents, getEvent, createEvent, updateEvent, deleteEvent } from './calendar.controller.js';
import authenticateToken from '../../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

router.route('/')
  .get(getEvents)
  .post(createEvent);

router.route('/:id')
  .get(getEvent)
  .put(updateEvent)
  .delete(deleteEvent);

export default router;
