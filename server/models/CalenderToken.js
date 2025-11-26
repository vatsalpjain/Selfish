import mongoose from 'mongoose';

const calendarTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessToken: String,
  refreshToken: String,
  expiryDate: Date
});

export default mongoose.model('CalendarToken', calendarTokenSchema);