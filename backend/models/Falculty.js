// models/Faculty.js
const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  role: { type: String, enum: ["Teacher", "HOD", "Admin", "Lab Assistant"], default: "Teacher" },
});

module.exports = mongoose.model("Faculty", facultySchema);
