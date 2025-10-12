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

module.exports = mongoose.model("Booking", bookingSchema);
