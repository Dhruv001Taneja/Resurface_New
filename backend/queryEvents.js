import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CalendarEvent from './src/models/calendarEvent.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    const events = await CalendarEvent.find().lean();
    console.log("EVENTS:", JSON.stringify(events, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
