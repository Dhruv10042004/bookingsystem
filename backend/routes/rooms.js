const express = require("express");
const Room = require("../models/Room");
const { authenticateUser, authorizeRole } = require("../middleware/auth");
const router = express.Router();

/**
 * 📌 Add Predefined Rooms to Database (If Not Exists)
 */
router.post("/add-rooms", async (req, res) => {
  try {
    console.log(1)
    const rooms = [
      { name: "64", type: "Classroom", capacity: 70, location: "Department of Information Technology" },
      { name: "65", type: "Classroom", capacity: 70, location: "Department of Information Technology" },
      { name: "66", type: "Classroom", capacity: 70, location: "Department of Information Technology" },
      { name: "Lab1", type: "Lab", capacity: 35, location: "Department of Information Technology" },
      { name: "Lab2", type: "Lab", capacity: 35, location: "Department of Information Technology" },
      { name: "Lab3", type: "Lab", capacity: 35, location: "Department of Information Technology" }
    ];

    for (const room of rooms) {
      const existingRoom = await Room.findOne({ name: room.name });
      if (!existingRoom) {
        await Room.create({ ...room, schedule: [] });
      }
    }

    res.status(201).json({ message: "Rooms added successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📌 Get All Rooms (with details)
 */
router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: "Server error while fetching rooms" });
  }
});

/**
 * 📌 Fetch Timetable for a Specific Room
 */
router.get("/:roomName/timetable", async (req, res) => {
  try {
    console.log(1);
    const { roomName } = req.params;
    const room = await Room.findOne({ name: roomName });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json({ timetable: room.schedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/available", async (req, res) => {
  try {
    const { day, date } = req.query;
    console.log(day,date);
    if (!day) {
      return res.status(400).json({ error: "Day is required" });
    }
    
    // Convert date string to Date object if provided
    const requestDate = date ? new Date(date) : null;
    
    // Format date to YYYY-MM-DD for comparison
    const formattedRequestDate = requestDate ? 
      requestDate.toISOString().split('T')[0] : null;
    
    // Fetch all rooms
    const allRooms = await Room.find();
    
    // Fetch booked slots on the given day
    const bookedRooms = await Room.find({ "schedule.day": day });
    
    const bookedRoomMap = {};
    bookedRooms.forEach(room => {
      console.log(`\n=== Processing Room: ${room.name} ===`);
      console.log(`Total schedule entries: ${room.schedule.length}`);
      
      bookedRoomMap[room.name] = room.schedule
        .filter(sch => {
          // Must match the day
          if (sch.day !== day) return false;
          console.log(`Entry for day ${sch.day}: ${sch.startTime}-${sch.endTime}, status: ${sch.approvalStatus}`);
          
          // If it's a default/recurring schedule, always include it
          if (sch.approvalStatus === "default") {
            console.log(`  → Including default/recurring entry`);
            return true;
          }
          
          // If it's a booking (pending, approved, or granted status)
          if (sch.approvalStatus !== "default") {
            console.log(`  → Checking booking entry`);
            // If no specific date requested, skip bookings (they're specific to a date)
            if (!requestDate) {
              console.log(`  → No requestDate, skipping`);
              return false;
            }
            
            // Check if the booking date matches the requested date
            if (sch.date) {
              const bookingDate = new Date(sch.date);
              const formattedBookingDate = bookingDate.toISOString().split('T')[0];
              const matches = formattedBookingDate === formattedRequestDate;
              console.log(`  → Checking date: ${formattedBookingDate} vs ${formattedRequestDate}, Match: ${matches}`);
              return matches;
            }
            
            console.log(`  → No date field, skipping`);
            return false;
          }
          
          return false;
        })
        .map(sch => {
          const normStart = normalizeTime(sch.startTime);
          const normEnd = normalizeTime(sch.endTime);
          console.log(`  Normalizing ${sch.startTime}-${sch.endTime} → ${normStart}-${normEnd} minutes`);
          return {
            startTime: normStart,
            endTime: normEnd,
            originalStart: sch.startTime,
            originalEnd: sch.endTime,
            approvalStatus: sch.approvalStatus
          };
        });
      
      console.log(`Room ${room.name}: ${bookedRoomMap[room.name].length} booked slots after filtering`);
      bookedRoomMap[room.name].forEach((slot, idx) => {
        console.log(`  Slot ${idx + 1}: ${slot.originalStart}-${slot.originalEnd}`);
      });
    });
    
    // Define all possible time slots (matching frontend format: 08:00-08:30, 08:30-09:00, etc.)
    const timeSlots = [
      "08:00", "08:30", "09:00", "09:30",
      "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "01:00", "01:30",
      "02:00", "02:30", "03:00", "03:30",
      "04:00", "04:30", "05:00", "05:30", "06:00"
    ];
    
    // Find available slots for each room
    const availableRooms = {};
    allRooms.forEach(room => {
      const bookedSlots = bookedRoomMap[room.name] || [];
      const availableSlots = [];
      
      // Check each potential time slot
      for (let i = 0; i < timeSlots.length - 1; i++) {
        const slotStart = timeSlots[i];
        const slotEnd = timeSlots[i + 1];
        
        // Normalize for comparison
        const normalizedStart = normalizeTime(slotStart);
        const normalizedEnd = normalizeTime(slotEnd);
        
        // Check if this slot overlaps with any booked slot
        let isBooked = false;
        
        for (const booking of bookedSlots) {
          // Check if the time ranges overlap
          const overlaps = isOverlapping(normalizedStart, normalizedEnd, booking.startTime, booking.endTime);
          console.log(`  Checking overlap: slot[${slotStart}→${slotEnd}] vs booking[${booking.originalStart}→${booking.originalEnd}] (normalized: ${normalizedStart}-${normalizedEnd} vs ${booking.startTime}-${booking.endTime})`);
          console.log(`  Overlap result: ${overlaps}`);
          
          if (overlaps) {
            console.log(`✓ Slot ${slotStart}-${slotEnd} overlaps with booked ${booking.originalStart}-${booking.originalEnd}`);
            isBooked = true;
            break;
          }
        }
        
        if (!isBooked) {
          availableSlots.push({
            startTime: slotStart,
            endTime: slotEnd
          });
        }
      }
      console.log(availableSlots);
      // Add room details along with available slots
      availableRooms[room.name] = {
        type: room.type,
        capacity: room.capacity,
        availableSlots
      };
    });
    
    res.json(availableRooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Convert time to a number of minutes since midnight for easy comparison
// Convert time to a number of minutes since midnight for easy comparison
function normalizeTime(timeStr) {
  // Handle times in format "HH:MM AM/PM" or "HH:MM"
  const parts = timeStr.trim().split(' ');
  const timePart = parts[0];
  const [hours, minutes] = timePart.split(':').map(part => parseInt(part, 10));
  const period = parts[1]; // "AM" or "PM" (if exists)
  
  let hour24 = hours;
  
  // If there's an AM/PM indicator
  if (period) {
    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hour24 = hours + 12; // 1 PM = 13:00, 2 PM = 14:00, etc.
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hour24 = 0; // 12 AM = 00:00
    }
  } else {
    // No AM/PM indicator
    // Handle times based on your schedule pattern (08:00 to 06:00)
    // Morning times: 08:00-12:00 (stay as-is)
    // Afternoon times: 01:00-06:00 (convert to PM by adding 12)
    
    if (hours >= 1 && hours <= 7 && hours !== 12) {
      // Times like 1:00, 2:00, 3:00, 4:00, 5:00, 5:30, 6:00 are PM
      hour24 = hours + 12; // 4:00 -> 16:00, 6:00 -> 18:00
    } else if (hours === 12) {
      // 12:00 stays as 12 (noon)
      hour24 = 12;
    }
    // Hours 8-11 stay as-is (morning: 08:00, 09:00, 10:00, 11:00)
  }
  
  return hour24 * 60 + (minutes || 0);
}

// Function to check if two time ranges overlap
function isOverlapping(start1, end1, start2, end2) {
  // Two ranges overlap if one starts before the other ends
  // Example: 
  // Slot: 5:30-6:00 (17:30-18:00) = 1050-1080 minutes
  // Booking: 4:00-6:00 PM (16:00-18:00) = 960-1080 minutes
  // max(1050, 960) = 1050
  // min(1080, 1080) = 1080
  // 1050 < 1080 = TRUE (overlaps)
  
  return Math.max(start1, start2) < Math.min(end1, end2);
}

// Example usage and test cases:
console.log("=== Time Normalization Tests ===");
console.log("08:00 ->", normalizeTime("08:00"), "minutes (480 = 8:00 AM)");
console.log("12:00 ->", normalizeTime("12:00"), "minutes (720 = 12:00 PM)");
console.log("01:00 ->", normalizeTime("01:00"), "minutes (780 = 1:00 PM)");
console.log("04:00 ->", normalizeTime("04:00"), "minutes (960 = 4:00 PM)");
console.log("05:30 ->", normalizeTime("05:30"), "minutes (1050 = 5:30 PM)");
console.log("06:00 ->", normalizeTime("06:00"), "minutes (1080 = 6:00 PM)");
console.log("04:00 PM ->", normalizeTime("04:00 PM"), "minutes (960 = 4:00 PM)");
console.log("06:00 PM ->", normalizeTime("06:00 PM"), "minutes (1080 = 6:00 PM)");

console.log("\n=== Overlap Tests ===");
console.log("Testing: Does 5:30-6:00 overlap with booking 4:00-6:00?");
console.log("(All times without AM/PM are interpreted as PM for 1:00-6:00 range)\n");

// Test: Does 5:30-6:00 overlap with 4:00-6:00?
const slot1Start = normalizeTime("05:30"); // Should be 1050 (5:30 PM)
const slot1End = normalizeTime("06:00");   // Should be 1080 (6:00 PM)
const booking1Start = normalizeTime("04:00"); // Should be 960 (4:00 PM)
const booking1End = normalizeTime("06:00");   // Should be 1080 (6:00 PM)

console.log(`Slot 5:30-6:00 → ${slot1Start}-${slot1End} minutes`);
console.log(`Booking 4:00-6:00 → ${booking1Start}-${booking1End} minutes`);
console.log(`Overlaps: ${isOverlapping(slot1Start, slot1End, booking1Start, booking1End)} ✓ (SHOULD BE TRUE)`);

// Test: Does 5:00-5:30 overlap with 4:00-6:00?
console.log("\nTesting: Does 5:00-5:30 overlap with booking 4:00-6:00?");
const slot2Start = normalizeTime("05:00"); // Should be 1020 (5:00 PM)
const slot2End = normalizeTime("05:30");   // Should be 1050 (5:30 PM)
console.log(`Slot 5:00-5:30 → ${slot2Start}-${slot2End} minutes`);
console.log(`Booking 4:00-6:00 → ${booking1Start}-${booking1End} minutes`);
console.log(`Overlaps: ${isOverlapping(slot2Start, slot2End, booking1Start, booking1End)} ✓ (SHOULD BE TRUE)`);

// Test: Does 3:30-4:00 overlap with 4:00-6:00?
console.log("\nTesting: Does 3:30-4:00 overlap with booking 4:00-6:00?");
const slot3Start = normalizeTime("03:30"); // Should be 930 (3:30 PM)
const slot3End = normalizeTime("04:00");   // Should be 960 (4:00 PM)
console.log(`Slot 3:30-4:00 → ${slot3Start}-${slot3End} minutes`);
console.log(`Booking 4:00-6:00 → ${booking1Start}-${booking1End} minutes`);
console.log(`Overlaps: ${isOverlapping(slot3Start, slot3End, booking1Start, booking1End)} (SHOULD BE FALSE - slots touch but don't overlap)`);

// Function to check if two time ranges overlap
function isOverlapping(start1, end1, start2, end2) {
  // Two ranges overlap if the start of one is before the end of the other
  // and the end of the first is after the start of the second
  return Math.max(start1, start2) < Math.min(end1, end2);
}
router.get("/:roomName/available-week", async (req, res) => {
  try {
    const { roomName } = req.params;
    const room = await Room.findOne({ name: roomName });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const timeSlots = [
      "08:00", "08:30", "09:00", "09:30",
      "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "01:00", "01:30",
      "02:00", "02:30", "03:00", "03:30",
      "04:00", "04:30", "05:00", "05:30", "06:00"
    ];

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const availableWeekSchedule = {};

    daysOfWeek.forEach(day => {
      const bookedSlots = room.schedule.filter(sch => sch.day === day);
      const availableSlots = [];

      for (let i = 0; i < timeSlots.length - 1; i++) {
        const slotStart = timeSlots[i];
        const slotEnd = timeSlots[i + 1];
        const isBooked = bookedSlots.some(
          b => b.startTime < slotEnd && b.endTime > slotStart
        );
        if (!isBooked) {
          availableSlots.push({ startTime: slotStart, endTime: slotEnd });
        }
      }
      availableWeekSchedule[day] = availableSlots;
    });

    res.json({ roomName, availableWeekSchedule });
  } catch (error) {
    res.status(500).json({ error: "Server error while fetching available timeslots" });
  }
});
/**
//  * 📌 Add or Update a Timetable Entry for a Room
//  */
/**
 * 📌 Add or Update a Timetable Entry for a Room
 */
router.post("/add", async (req, res) => {
  try {
    console.log("📥 Received Data:", req.body);
    
    const { name, day, startTime, endTime, faculty, subject, capacity, type} = req.body;
    const {year,division}=req.body.class;
    
    if (!name || !day || !startTime || !endTime || !faculty || !subject || !capacity || !type) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    let existingRoom = await Room.find({ name });
    
    if (!existingRoom) {
      console.log("⚠️ Room not found. Creating new room...");
      existingRoom = new Room({ name, type, capacity, location: "N/A", schedule: [] });
      await existingRoom.save();
    }
    if (!existingRoom.schedule) {
      existingRoom.schedule = [];
    }
    const conflict = existingRoom.schedule.some(
      (entry) =>
        entry.day === day &&
        ((startTime >= entry.startTime && startTime < entry.endTime) ||
        (endTime > entry.startTime && endTime <= entry.endTime))
    );
    
    if (conflict) {
      return res.status(400).json({ error: "Time slot conflict! Room is already booked at this time." });
    }
    
    await Room.updateOne(
      { name },
      { 
        $push: {
          schedule: {
            day,
            startTime,
            endTime,
            faculty: Array.isArray(faculty) ? faculty : [faculty], // ✅ Ensure faculty is an array
            subject,
            class:{year,division}// Added default approval status
          }
        },
        $setOnInsert: { type, capacity, location: "N/A" }
      },
      { upsert: true }
    );
    
    console.log("✅ Room updated in database");
    
    res.status(201).json({ message: "Timetable entry added successfully!" });
  } catch (error) {
    console.error("❌ Error Saving Room:", error);
    res.status(500).json({ error: "Server error while adding timetable entry" });
  }
});

/**
 * 📌 Update a Timetable Entry (Subject & Faculty)
 */
router.put("/:roomName/schedule/:entryId", authenticateUser, authorizeRole(["Admin","Lab Assistant"]), async (req, res) => {
  try {
    const { roomName, entryId } = req.params;
    const { subject, faculty, class: classInfo } = req.body;
    const { year, division } = classInfo || {};

    if (!subject || !faculty) {
      return res.status(400).json({ error: "Both subject and faculty are required." });
    }
    
    console.log(1);
    
    const room = await Room.findOneAndUpdate(
      { name: roomName, "schedule._id": entryId },
      { 
        $set: {
          "schedule.$.subject": subject,
          "schedule.$.faculty": Array.isArray(faculty) ? faculty : [faculty], // ✅ Ensure faculty is an array
          "schedule.$.class.year": year,
          "schedule.$.class.division": division
        } 
      },
      { new: true }
    );
    
    if (!room) {
      return res.status(404).json({ error: "Room or schedule entry not found." });
    }
    
    res.json({ message: "Timetable entry updated successfully!", room });
  } catch (error) {
    console.error("❌ Error updating timetable:", error);
    res.status(500).json({ error: "Server error while updating timetable entry." });
  }
});
/**
 * 📌 Delete a Timetable Entry
 */
router.delete("/:roomName/schedule/:entryId", authenticateUser, authorizeRole(["Admin","Lab Assistant"]), async (req, res) => {
  try {
    const { roomName, entryId } = req.params;

    // ✅ Find room and remove the schedule entry
    const room = await Room.findOneAndUpdate(
      { name: roomName },
      { $pull: { schedule: { _id: entryId } } }, // Remove the entry with matching ID
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: "Room or schedule entry not found." });
    }

    res.json({ message: "Timetable entry deleted successfully!", room });
  } catch (error) {
    console.error("❌ Error deleting timetable entry:", error);
    res.status(500).json({ error: "Server error while deleting timetable entry." });
  }
});
// In your routes file (likely in routes/roomRoutes.js or similar)

// Delete a room and all its schedule entries
router.delete('/:roomName', authenticateUser,authorizeRole(["Admin","Lab Assistant"]), async (req, res) => {
  try {
    const { roomName } = req.params;
    console.log("dhruv");
    // First, find the room to ensure it exists
    const room = await Room.findOne({ name: roomName });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Delete all timetable entries for this room
    // await Schedule.deleteMany({ room: room._id });
    
    // Delete the room itself
    await Room.deleteOne({ _id: room._id });
    
    res.status(200).json({ message: 'Room and all its schedule entries deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: 'Server error while deleting room', error: error.message });
  }
});
module.exports = router;
