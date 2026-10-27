import express from 'express';
import { getEvents, getEvent, createEvent, updateEvent, deleteEvent } from './calendar.controller.js';
import authenticateToken from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validator.js';
import { createEventSchema, updateEventSchema } from './calendar.validation.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

router.route('/')
  .get(getEvents)
  .post(validateRequest({ body: createEventSchema }), createEvent);

router.route('/:id')
  .get(getEvent)
  .put(validateRequest({ body: updateEventSchema }), updateEvent)
  .delete(deleteEvent);

export default router;
