const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  classroom: { type: String, required: true },
  date: { type: String, required: true },
  timeSlot: { type: String, required: true },
  purpose: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Rejected", "Approved by Admin"], default: "Pending" },
  hodStatus: { type: String, enum: ["Pending", "Granted", "Rejected", "N/A"], default: "Pending" }
});

// ✅ Add indexes for frequently queried fields to improve query performance
bookingSchema.index({ teacher: 1 });
bookingSchema.index({ classroom: 1 });
bookingSchema.index({ date: 1 });
bookingSchema.index({ classroom: 1, date: 1, timeSlot: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ hodStatus: 1 });
bookingSchema.index({ teacher: 1, status: 1 });
bookingSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
