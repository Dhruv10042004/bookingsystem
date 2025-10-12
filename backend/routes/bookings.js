const express = require("express");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const dotenv = require("dotenv");
const User = require("../models/User"); // We'll need this to get admin emails
const router = express.Router();
const { authenticateUser, authorizeRole } = require("../middleware/auth");
const nodemailer = require("nodemailer");
dotenv.config();
// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service:"Gmail", // Use environment variable or default to gmail
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASSWORD, // Your email password or app password
  },
  // Add additional security options for Gmail
  secure: true, // Use SSL
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false
  },
  // Debug options - uncomment if needed to troubleshoot
  // debug: true,
  // logger: true
});

// Helper function to send email notifications with better error handling
async function sendEmailNotification(toEmail, subject, message) {
  try {
    // Verify transporter connection before sending
    await transporter.verify();
    
    const mailOptions = {
      from: `"Room Booking System" <${process.env.EMAIL_USER}>`, // Formatted sender name
      to: toEmail,
      subject: subject,
      html: message,
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email notification sent to ${toEmail} [${info.messageId}]`);
    return true;
  } catch (error) {
    console.error("📮 Error sending email notification:", error);
    
    // Provide more detailed error information
    if (error.code === 'EAUTH') {
      console.error("❌ Authentication failed: Check your email credentials");
    } else if (error.code === 'ESOCKET') {
      console.error("❌ Network error: Check your internet connection");
    }
    
    return false;
  }
}

// Helper function to get admin emails
async function getAdminEmails() {
  try {
    const admins = await User.find({ role: "Admin" }).select("email");
    return admins.map(admin => admin.email);
  } catch (error) {
    console.error("Error fetching admin emails:", error);
    // Return a default admin email if configured
    return process.env.DEFAULT_ADMIN_EMAIL ? [process.env.DEFAULT_ADMIN_EMAIL] : [];
  }
}

async function removeExpiredBookings() {
  try {
    const today = new Date();
    // today.setHours(0, 0, 0, 0); // Normalize to start of the day
    
    console.log("⏳ Running Cleanup: Checking for expired bookings...");
    
    // Convert today to ISO string format (YYYY-MM-DD) to match your date storage format
    const todayStr = today.toISOString().split('T')[0];
    console.log(todayStr)
    // Find bookings with dates in the past
    const expiredBookings = await Booking.find({ 
      date: { $lt: todayStr} 
    }).populate("teacher", "name email");
    
    if (expiredBookings.length === 0) {
      console.log("✅ No expired bookings found.");
      return { removed: 0 };
    }
    
    console.log(`🚨 Found ${expiredBookings.length} expired bookings to clean up.`);
    
    // Process each expired booking
    let cleanupCount = 0;
    for (const booking of expiredBookings) {
      try {
        // Find the corresponding room
        const room = await Room.findOne({ name: booking.classroom });
        
        if (room) {
          // Parse the time slot
          const [startTime, endTime] = booking.timeSlot.split("-");
          
          // Get the day of week from the booking date
          const bookingDate = new Date(booking.date);
          const date=bookingDate.toISOString().split('T')[0];
          const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const bookingDay = daysOfWeek[bookingDate.getDay()]; 
          
          // Find the exact schedule entry to remove
          const initialScheduleLength = room.schedule.length;
          
          // Remove only the specific booking entry from the room schedule
          room.schedule = room.schedule.filter(entry => {
            // Keep all entries that don't match the exact booking parameters
            return !(
              entry.date.toISOString().split('T')[0]===date&&
              entry.day === bookingDay && 
              entry.startTime === startTime && 
              entry.endTime === endTime &&
              (
                // Match any approval status since we're removing expired bookings regardless of status
                entry.approvalStatus === "pendingApproval" || 
                entry.approvalStatus === "approved" || 
                entry.approvalStatus === "granted"
              )
            );
          });
          
          // Only save if we actually removed something
          if (initialScheduleLength > room.schedule.length) {
            await room.save();
            console.log(`🧹 Removed expired booking slot from room ${room.name} schedule`);
          }
        }
        
        // Delete the expired booking document
        // await Booking.findByIdAndDelete(booking._id);
        cleanupCount++;
        
      } catch (error) {
        console.error(`Error processing expired booking ${booking._id}:`, error);
        // Continue with next booking even if this one fails
      }
    }
    
    console.log(`🗑️ Successfully removed ${cleanupCount} expired bookings!`);
    return { removed: cleanupCount };
    
  } catch (error) {
    console.error("🚨 Error in removing expired bookings:", error);
    throw error;
  }
}

// 📌 Teacher Requests a Booking (Temporarily Block Slot)
router.post("/", authenticateUser, async (req, res) => {
  try {
    console.log("Received booking request:", req.body);
    
    const { roomId, date, day, timeSlot, purpose, subject, faculty, class: classInfo } = req.body;
    
    // Add debugging to understand the date issue
    console.log("Booking date received:", date);
    console.log("Current date:", new Date().toISOString());
    
    // More lenient date validation - only block past dates, allow same-day bookings
    if (date) {
      const bookingDate = new Date(date);
      const currentDate = new Date();
      
      // Strip time components for pure date comparison
      const bookingDateStr = bookingDate.toISOString().split('T')[0];
      const currentDateStr = currentDate.toISOString().split('T')[0];
      
      console.log("Booking date (date only):", bookingDateStr);
      console.log("Current date (date only):", currentDateStr);
      
      // Only block dates in the past, allow today's date
      if (new Date(bookingDateStr) <= new Date(currentDateStr)) {
        console.log("Rejecting booking: date is in the past");
        return res.status(400).json({ 
          error: "Booking date cannot be in the past." 
        });
      }
    }
    
    console.log("Step 1: Checking existing bookings");
    console.log(req.user)
    // Check if the slot is already booked
    const existingBooking = await Booking.findOne({
      classroom: roomId,
      date,
      timeSlot,
      status: { $ne: "Rejected" }, // Ignore rejected bookings
    });
    
    if (existingBooking) {
      return res.status(400).json({ error: "This time slot is already booked." });
    }
    
    console.log("Step 2: Creating new booking");
    const booking = new Booking({
      teacher: req.user.id,
      classroom: roomId,
      date,
      day, // Include the day
      timeSlot,
      purpose,
      status: "Pending",
      hodStatus: "Pending",
    });
    
    await booking.save();
    console.log("Step 3: Booking saved successfully!");
    
    // 📌 **TEMPORARILY BLOCK SLOT IN TIMETABLE**
    console.log("Step 4: Updating room schedule temporarily");
    const room = await Room.findOne({ name: roomId });
    
    if (!room) {
      console.error("🚨 Error: Room not found in the database!");
      return res.status(404).json({ error: "Room not found" });
    }
    
    const [startTime, endTime] = timeSlot.split("-");
    console.log("Step 5: Adding temporary slot in room timetable");
    
    room.schedule.push({
      day,
      startTime,
      endTime,
      subject: subject || "Pending Approval",
      faculty: faculty || req.user.name,
      class: {
        year: classInfo?.year || "",
        division: classInfo?.division || ""
      },
      approvalStatus: "pendingApproval",
      date
      // Assigning booking requester's name
    });
    
    await room.save();
    console.log("Step 6: Room schedule updated successfully");
    
    // 📧 Send email notification to admin
    const formattedDate = new Date(date).toLocaleDateString();
    const adminEmails = await getAdminEmails();
    
    if (adminEmails.length > 0) {
      const emailSubject = "New Booking Request Requires Approval";
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;">
          <h2 style="color: #2c3e50;">New Booking Request Requires Approval</h2>
          <p>A new booking request has been submitted and requires your approval:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Teacher:</strong> ${req.user.name} (${req.user.email})</p>
            <p><strong>Room:</strong> ${roomId}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Day:</strong> ${day}</p>
            <p><strong>Time Slot:</strong> ${timeSlot}</p>
            <p><strong>Subject:</strong> ${subject || "Not specified"}</p>
            <p><strong>Faculty:</strong> ${faculty || req.user.name}</p>
            <p><strong>Class:</strong> ${classInfo?.year || ""}${classInfo?.division ? `-${classInfo.division}` : ""}</p>
            <p><strong>Purpose:</strong> ${purpose}</p>
          </div>
          
          <p>Please log in to the admin dashboard to approve or reject this request.https://bookingsystem-bay.vercel.app</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `;
      
      try {
        await sendEmailNotification(adminEmails, emailSubject, emailMessage);
        console.log("✉️ Admin notification email sent successfully");
      } catch (emailError) {
        console.error("📮 Failed to send admin notification email:", emailError);
        // We don't want to block the booking process if email fails
      }
    } else {
      console.log("⚠️ No admin emails found to send notification");
    }
    
    res.status(201).json({ message: "Booking request submitted!", booking });
  } catch (error) {
    console.error("🚨 Error in booking:", error.message);
    res.status(500).json({ error: "Server error while processing booking." });
  }
});

// 📌 Get All Bookings (For Admin & HOD)
router.get("/", authenticateUser, authorizeRole(["Admin", "HOD"]), async (req, res) => {
  try {
    // await removeExpiredBookings();
    const bookings = await Booking.find().populate("teacher", "name email");
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Server error while fetching bookings" });
  }
});

// 📌 Admin Approves Booking
router.put("/admin/approve/:id", authenticateUser, authorizeRole(["Admin"]), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("teacher", "name email");
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.status !== "Pending") {
      return res.status(400).json({ error: "Booking already processed" });
    }

    // **Find the Room**
    const room = await Room.findOne({ name: booking.classroom });
    if (room) {
      console.log("🏫 Room Before Update:", room);

      // ✅ **Extract Start & End Time from booking**
      const [startTime, endTime] = booking.timeSlot.split("-");

      // ✅ **Convert booking.date to the corresponding day**
      const bookingDate = new Date(booking.date);
      const date=bookingDate.toISOString().split('T')[0];
      // console.log(date);
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const bookingDay = daysOfWeek[bookingDate.getUTCDay()]; // Ensure correct day conversion

      // ✅ **Update the Subject in Schedule**
      room.schedule = room.schedule.map((entry) => {
        if (entry.day === bookingDay && entry.startTime === startTime && entry.endTime === endTime &&entry.date.toISOString().split('T')[0]===date) {
          // console.log(entry.date);
          return { ...entry, subject: "Approved by Admin" ,approvalStatus:"approved"}; // Update subject
        }
        return entry;
      });

      console.log("✅ Updated Room Schedule:", room.schedule);

      await room.save();
    }

    // ✅ **Update Booking Status**
    booking.status = "Approved by Admin";
    booking.hodStatus = "Pending";
    await booking.save();

    // 📧 Send notification email to HOD
    try {
      const hodEmails = await User.find({ role: "HOD" }).select("email").then(hods => hods.map(hod => hod.email));
      
      if (hodEmails.length > 0) {
        const bookingDate=new Date(booking.date);
        const formattedDate = new Date(booking.date).toLocaleDateString();
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const bookingDay = daysOfWeek[bookingDate.getUTCDay()]; // Ensure correct day conversion
        // Ensure correct day conversion
        const emailSubject = "Booking Approved by Admin - HOD Approval Required";
        const emailMessage = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;">
            <h2 style="color: #2c3e50;">Booking Approved by Admin - Needs HOD Approval</h2>
            <p>A booking has been approved by the admin and now requires your approval:</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Teacher:</strong> ${booking.teacher.name} (${booking.teacher.email})</p>
              <p><strong>Room:</strong> ${booking.classroom}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Day:</strong> ${bookingDay}</p>
              <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
              <p><strong>Purpose:</strong> ${booking.purpose}</p>
            </div>
            
            <p>Please log in to the HOD dashboard to grant or reject this booking request.https://bookingsystem-bay.vercel.app</p>
            <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
          </div>
        `;
        
        await sendEmailNotification(hodEmails, emailSubject, emailMessage);
        console.log("✉️ HOD notification email sent successfully");
      }
      
      // Also notify the teacher that their booking was approved by admin
      const teacherEmailSubject = "Your Booking Request Approved by Admin";
      const teacherEmailMessage = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;">
          <h2 style="color: #2c3e50;">Your Booking Request Has Been Approved by Admin</h2>
          <p>Good news! Your booking request has been approved by the admin and is now awaiting HOD approval:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Room:</strong> ${booking.classroom}</p>
            <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
            <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
            <p><strong>Purpose:</strong> ${booking.purpose}</p>
            <p><strong>Status:</strong> Approved by Admin, Awaiting HOD Approval</p>
          </div>
          
          <p>You will be notified once the HOD has made their decision.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `;
      
      await sendEmailNotification(booking.teacher.email, teacherEmailSubject, teacherEmailMessage);
      console.log("✉️ Teacher notification email sent successfully");
      
    } catch (emailError) {
      console.error("📮 Error sending notification emails:", emailError);
      // Continue even if email sending fails
    }

    res.json({ message: "Booking approved by admin and updated in the schedule", booking });
  } catch (error) {
    console.error("🚨 Error Approving Booking:", error.message);
    res.status(500).json({ error: "Server error while approving booking." });
  }
});


// 📌 Admin Rejects Booking (Slot Becomes Available Again)
router.put("/admin/reject/:id", authenticateUser, authorizeRole(["Admin"]), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("teacher", "name email");
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    console.log("🔍 Booking Details:", booking);

    if (booking.status !== "Pending") {
      return res.status(400).json({ error: "Booking already processed" });
    }

    // **Find the Room**
    const room = await Room.findOne({ name: booking.classroom });
    if (room) {
      console.log("🏫 Room Before Update:", room);

      // ✅ **Extract Start & End Time from booking**
      const [startTime, endTime] = booking.timeSlot.split("-");

      // ✅ **Convert booking.date to the corresponding day**
      const bookingDate = new Date(booking.date);
      const date=bookingDate.toISOString().split('T')[0];
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const bookingDay = daysOfWeek[bookingDate.getUTCDay()]; // Ensure correct day conversion

      // ✅ **Filter out the rejected slot**
      room.schedule = room.schedule.filter(
        (entry) => !(entry.day === bookingDay && entry.startTime === startTime && entry.endTime === endTime&&entry.date.toISOString().split('T')[0]===date)
      );

      console.log("✅ Updated Room Schedule:", room.schedule);

      await room.save();
    }

    // ✅ **Update Booking Status**
    booking.status = "Rejected";
    booking.hodStatus = "N/A";
    await booking.save();

    // 📧 Send notification email to the teacher
    try {
      const emailSubject = "Your Booking Request Has Been Rejected";
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;">
          <h2 style="color: #e74c3c;">Your Booking Request Has Been Rejected</h2>
          <p>We regret to inform you that your booking request has been rejected by the admin:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Room:</strong> ${booking.classroom}</p>
            <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
            <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
            <p><strong>Purpose:</strong> ${booking.purpose}</p>
          </div>
          
          <p>If you have any questions or need further clarification, please contact the administration.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `;
      
      await sendEmailNotification(booking.teacher.email, emailSubject, emailMessage);
      console.log("✉️ Teacher rejection notification email sent successfully");
    } catch (emailError) {
      console.error("📮 Error sending rejection notification email:", emailError);
      // Continue even if email sending fails
    }

    res.json({ message: "Booking rejected by admin and slot is now available", booking });
  } catch (error) {
    console.error("🚨 Error Rejecting Booking:", error.message);
    res.status(500).json({ error: "Server error while rejecting booking." });
  }
});


// 📌 HOD Grants Booking (Final Approval)
router.put("/hod/grant/:id", authenticateUser, authorizeRole(["HOD"]), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("teacher", "name email");
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.status !== "Approved by Admin") {
      return res.status(400).json({ error: "Booking must be approved by admin first" });
    }

    // ✅ Update Booking as Granted
    booking.hodStatus = "Granted";
    await booking.save();

    // ✅ FIND THE ROOM & UPDATE TIMETABLE
    const room = await Room.findOne({ name: booking.classroom });
    if (room) {
      console.log("🏫 Room Before Update:", room);

      // ✅ Extract start and end time
      const [startTime, endTime] = booking.timeSlot.split("-");

      // ✅ Convert booking.date to weekday
      const bookingDate = new Date(booking.date);
      const date=bookingDate.toISOString().split('T')[0];
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const bookingDay = daysOfWeek[bookingDate.getUTCDay()];

      // ✅ Update schedule with final subject and faculty
      room.schedule = room.schedule.map((entry) => {
        if (entry.day === bookingDay && entry.startTime === startTime && entry.endTime === endTime&&entry.date.toISOString().split('T')[0]===date) {
          return { ...entry, subject: booking.purpose, faculty: booking.teacher.name,approvalStatus:"granted" }; // Update subject & faculty
        }
        return entry;
      });

      console.log("✅ Updated Room Schedule:", room.schedule);
      await room.save();
    }

    // 📧 Send notification email to the teacher
    try {
      const emailSubject = "Your Booking Has Been Granted";
      const bookingDate = new Date(booking.date);
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const bookingDay = daysOfWeek[bookingDate.getUTCDay()];
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;">
          <h2 style="color: #27ae60;">Your Booking Has Been Granted</h2>
          <p>Good news! Your booking request has been fully approved and granted:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Room:</strong> ${booking.classroom}</p>
            <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
            <p><strong>Day:</strong> ${bookingDay}</p>
            <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
            <p><strong>Purpose:</strong> ${booking.purpose}</p>
            <p><strong>Status:</strong> Granted</p>
          </div>
          
          <p>The room has been allocated for your use as requested.https://bookingsystem-bay.vercel.app</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `;
      
      await sendEmailNotification(booking.teacher.email, emailSubject, emailMessage);
      console.log("✉️ Teacher grant notification email sent successfully");
    } catch (emailError) {
      console.error("📮 Error sending grant notification email:", emailError);
      // Continue even if email sending fails
    }

    res.json({ message: "Booking granted by HOD and updated in the schedule", booking });
  } catch (error) {
    console.error("🚨 Error Granting Booking:", error.message);
    res.status(500).json({ error: "Server error while granting booking." });
  }
});


// 📌 HOD Rejects Booking (Make Slot Available Again)
router.put("/hod/reject/:id", authenticateUser, authorizeRole(["HOD"]), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("teacher", "name email");
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    console.log("🔍 Booking Details:", booking);

    if (booking.status !== "Approved by Admin") {
      return res.status(400).json({ error: "Booking must be approved by admin first" });
    }

    // **Find the Room**
    const room = await Room.findOne({ name: booking.classroom });
    if (room) {
      console.log("🏫 Room Before Update:", room);

      // ✅ **Extract Start & End Time from booking**
      const [startTime, endTime] = booking.timeSlot.split("-");

      // ✅ **Convert booking.date to the corresponding day**
      const bookingDate = new Date(booking.date);
      const date=bookingDate.toISOString().split('T')[0];
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const bookingDay = daysOfWeek[bookingDate.getUTCDay()]; // Ensure correct day conversion

      // ✅ **Filter out the rejected slot**
      room.schedule = room.schedule.filter(
        (entry) => !(entry.day === bookingDay && entry.startTime === startTime && entry.endTime === endTime&&entry.date.toISOString().split('T')[0]===date)
      );

      console.log("✅ Updated Room Schedule:", room.schedule);

      await room.save();
    }

    // ✅ **Update Booking Status**
    booking.hodStatus = "Rejected";
    await booking.save();

    // 📧 Send notification email to the teacher
    try {
      const emailSubject = "Your Booking Request Has Been Rejected by HOD";
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;">
          <h2 style="color: #e74c3c;">Your Booking Request Has Been Rejected by HOD</h2>
          <p>We regret to inform you that your booking request has been rejected by the HOD:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Room:</strong> ${booking.classroom}</p>
            <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
            <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
            <p><strong>Purpose:</strong> ${booking.purpose}</p>
            <p><strong>Status:</strong> Rejected by HOD</p>
          </div>
          
          <p>If you have any questions or need further clarification, please contact the department head.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `;
      
      await sendEmailNotification(booking.teacher.email, emailSubject, emailMessage);
      console.log("✉️ Teacher HOD rejection notification email sent successfully");
    } catch (emailError) {
      console.error("📮 Error sending HOD rejection notification email:", emailError);
      // Continue even if email sending fails
    }

    res.json({ message: "Booking rejected by HOD and slot is now available", booking });
  } catch (error) {
    console.error("🚨 Error Rejecting Booking:", error.message);
    res.status(500).json({ error: "Server error while rejecting booking." });
  }
});


// 📌 Get Bookings for a Teacher (For Teacher Dashboard)
router.get("/teacher", authenticateUser, async (req, res) => {
  try {
    // await removeExpiredBookings();
    const bookings = await Booking.find({ teacher: req.user.id }).populate("teacher", "name email");
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📌 Delete All Bookings (HOD only)
router.delete("/delete-all", authenticateUser, authorizeRole(["HOD"]), async (req, res) => {
  try {
    // Get all bookings
    const bookings = await Booking.find();
    console.log(`Found ${bookings.length} bookings to delete`);
    
    // Process each booking to remove from room schedules
    for (const booking of bookings) {
      try {
        const room = await Room.findOne({ name: booking.classroom });
        if (room) {
          const [startTime, endTime] = booking.timeSlot.split("-");
          const bookingDate = new Date(booking.date);
          const date = bookingDate.toISOString().split('T')[0];
          const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const bookingDay = daysOfWeek[bookingDate.getUTCDay()];

          // Remove only the booking slots that were pending, approved, or granted
          const initialLength = room.schedule.length;
          room.schedule = room.schedule.filter(entry => {
            // Skip entries without a date
            if (!entry.date) return true;

            try {
              const entryDate = entry.date.toISOString().split('T')[0];
              return !(
                entryDate === date &&
                entry.day === bookingDay &&
                entry.startTime === startTime &&
                entry.endTime === endTime &&
                (
                  entry.approvalStatus === "pendingApproval" ||
                  entry.approvalStatus === "approved" ||
                  entry.approvalStatus === "granted"
                )
              );
            } catch (err) {
              console.error("Error processing schedule entry:", err);
              return true; // Keep entries that cause errors
            }
          });

          if (initialLength !== room.schedule.length) {
            console.log(`Removed ${initialLength - room.schedule.length} slots from room ${room.name}`);
            await room.save();
          }
        }
      } catch (roomError) {
        console.error(`Error processing room for booking ${booking._id}:`, roomError);
        // Continue with next booking even if this one fails
      }
    }

    // Delete all bookings from the database
    const deleteResult = await Booking.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} bookings from database`);

    res.json({ 
      message: "All bookings have been deleted successfully",
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error("🚨 Error deleting all bookings:", error);
    res.status(500).json({ error: "Server error while deleting bookings" });
  }
});

module.exports = router;