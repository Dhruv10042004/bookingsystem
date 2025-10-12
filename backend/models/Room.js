const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Room/Lab Name
  type: { type: String, enum: ["Classroom", "Lab"], required: true }, // Type of Room
  capacity: { type: Number, required: true }, // Capacity of the Room
  location: { type: String, default: "Department of Information Technology" }, // Location of the Room
  schedule: [
    {
      day: {
        type: String,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        required: true
      },
      startTime: { type: String, required: true }, // Example: "08:00 AM"
      endTime: { type: String, required: true }, // Example: "08:30 AM"
      subject: { type: String, required: true }, // Example: "Machine Learning"
      faculty: [{ type: String, required: true }], // Example: ["Dr. Leena Sahu", "Prof. Rajesh Kumar"]
      class: {
        year: String,
        division: String,
      }, // Example: "I1" for division of the third year
      date: {
        type: Date,
        required: function() {
          return this.approvalStatus !== "default";
        }
      },
      approvalStatus: {
        type: String,
        enum: ["pendingApproval", "approved", "granted", "default"],
        default: "default"
      }
    }
  ]
});

module.exports = mongoose.model("Room", RoomSchema);