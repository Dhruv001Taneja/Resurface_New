import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    default: ''
  },
  endTime: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['event', 'task', 'date', 'deadline', 'reminder', 'other'],
    default: 'event'
  },
  priority: {
    type: String,
    default: ''
  },
  sourceScreenshotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Screenshot',
    default: null
  }
}, { timestamps: true });

// Prevent duplicate events based on sourceScreenshotId and title for the same user
calendarEventSchema.index({ userId: 1, sourceScreenshotId: 1, title: 1 }, { unique: true, sparse: true });

export default mongoose.model('CalendarEvent', calendarEventSchema);
