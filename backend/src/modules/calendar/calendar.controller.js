import CalendarEvent from '../../models/calendarEvent.js';
import logger from '../../utils/logger.js';

export const getEvents = async (req, res) => {
  try {
    const events = await CalendarEvent.find({ userId: req.userId })
      .populate('sourceScreenshotId')
      .sort({ date: 1 });
    res.status(200).json({ success: true, data: events });
  } catch (error) {
    logger.error(`Error fetching calendar events: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch calendar events' });
  }
};

export const getEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findOne({ _id: req.params.id, userId: req.userId }).populate('sourceScreenshotId');
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    logger.error(`Error fetching calendar event: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch calendar event' });
  }
};

export const createEvent = async (req, res) => {
  try {
    const { title, description, date, startTime, endTime, location, type, priority, sourceScreenshotId } = req.body;

    // Duplicate check
    if (sourceScreenshotId) {
      const existing = await CalendarEvent.findOne({
        userId: req.userId,
        sourceScreenshotId,
        title
      });

      if (existing) {
         return res.status(409).json({ success: false, error: 'Event already added to calendar', data: existing });
      }
    }

    const newEvent = await CalendarEvent.create({
      userId: req.userId,
      title,
      description,
      date,
      startTime,
      endTime,
      location,
      type: type || 'event',
      priority,
      sourceScreenshotId
    });

    res.status(201).json({ success: true, data: newEvent });
  } catch (error) {
    logger.error(`Error creating calendar event: ${error.message}`);
    // Handle unique index error
    if (error.code === 11000) {
       return res.status(409).json({ success: false, error: 'Event already added to calendar' });
    }
    res.status(500).json({ success: false, error: 'Failed to create calendar event' });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    logger.error(`Error updating calendar event: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update calendar event' });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    logger.error(`Error deleting calendar event: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to delete calendar event' });
  }
};
