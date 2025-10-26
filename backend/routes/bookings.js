const express = require("express");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const dotenv = require("dotenv");
const User = require("../models/User");
const router = express.Router();
const { authenticateUser, authorizeRole } = require("../middleware/auth");
const nodemailer = require("nodemailer");
dotenv.config();

// ✅ Gmail SMTP Port Configurations (will try in order)
const SMTP_CONFIGS = [
  {
    name: "Port 587 (STARTTLS) - Most Compatible",
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    }
  },
  {
    name: "Gmail Service (Auto-detect)",
    config: {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      pool: true,
    }
  },
  {
    name: "Port 465 (SSL)",
    config: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    }
  },
  {
    name: "Port 2525 (Alternative)",
    config: {
      host: 'smtp.gmail.com',
      port: 2525,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    }
  }
];

let transporter = null;
let lastSuccessfulConfig = null;

// ✅ Create transporter with automatic port fallback
async function createTransporter(forceNew = false) {
  if (!forceNew && lastSuccessfulConfig) {
    console.log(`✅ Using last successful config: ${lastSuccessfulConfig.name}`);
    return nodemailer.createTransport(lastSuccessfulConfig.config);
  }

  for (let i = 0; i < SMTP_CONFIGS.length; i++) {
    const smtpConfig = SMTP_CONFIGS[i];
    
    try {
      console.log(`🔧 Trying: ${smtpConfig.name}...`);
      const testTransporter = nodemailer.createTransport(smtpConfig.config);
      
      const verifyPromise = testTransporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Verification timeout')), 10000)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      
      console.log(`✅ Connected with: ${smtpConfig.name}`);
      lastSuccessfulConfig = smtpConfig;
      return testTransporter;
      
    } catch (error) {
      console.log(`❌ ${smtpConfig.name} failed: ${error.message}`);
      
      if (i < SMTP_CONFIGS.length - 1) {
        console.log(`🔄 Trying next configuration...`);
      }
    }
  }
  
  console.warn("⚠️ All configs failed verification, using Port 587 as fallback");
  return nodemailer.createTransport(SMTP_CONFIGS[0].config);
}

// Initialize on startup
(async () => {
  try {
    transporter = await createTransporter();
    console.log("✅ Email transporter initialized");
  } catch (error) {
    console.error("❌ Transporter init failed:", error.message);
    transporter = nodemailer.createTransport(SMTP_CONFIGS[0].config);
  }
})();

// ✅ Send email with retry and port fallback
async function sendEmailNotification(toEmail, subject, message, retryCount = 0) {
  const MAX_RETRIES = 3;
  
  try {
    console.log(`📮 Attempt ${retryCount + 1}/${MAX_RETRIES}`);
    console.log("📮 Config:", lastSuccessfulConfig?.name || "Default");
    console.log("📮 To:", toEmail);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error("❌ Email credentials not configured!");
      return false;
    }

    if (!transporter) {
      console.log("🔄 Creating new transporter...");
      transporter = await createTransporter();
    }
    
    const recipientEmails = Array.isArray(toEmail) ? toEmail.join(',') : toEmail;
    
    const mailOptions = {
      from: `"Room Booking System" <${process.env.EMAIL_USER}>`,
      to: recipientEmails,
      subject: subject,
      html: message,
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'Room Booking System',
      },
    };
    
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Send timeout')), 45000)
    );
    
    const info = await Promise.race([sendPromise, timeoutPromise]);
    
    console.log(`✅ Email sent! MessageId: ${info.messageId}`);
    console.log(`✅ Via: ${lastSuccessfulConfig?.name || 'Default'}`);
    return true;
    
  } catch (error) {
    console.error(`📮 Error attempt ${retryCount + 1}:`, error.message);
    console.error(`📮 Code:`, error.code);
    
    if (error.code === 'EAUTH') {
      console.error("❌ Auth failed - check EMAIL_USER and EMAIL_PASSWORD");
      return false;
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
      console.error(`❌ Connection error: ${error.message}`);
      
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`🔄 Trying different SMTP config...`);
        
        try {
          transporter = await createTransporter(true);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return sendEmailNotification(toEmail, subject, message, retryCount + 1);
        } catch (createError) {
          console.error("Failed to create transporter:", createError.message);
        }
      } else {
        console.error(`❌ All configs failed after ${MAX_RETRIES} attempts`);
        return false;
      }
    }
    
    if (retryCount < MAX_RETRIES - 1) {
      const delay = 2000 * (retryCount + 1);
      console.log(`🔄 Retry in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendEmailNotification(toEmail, subject, message, retryCount + 1);
    }
    
    return false;
  }
}

// ✅ Async wrapper
function sendEmailAsync(toEmail, subject, message) {
  console.log(`📧 Queuing email to:`, toEmail);
  
  sendEmailNotification(toEmail, subject, message)
    .then((success) => {
      if (success) {
        console.log(`✅ Email delivered to: ${toEmail}`);
      } else {
        console.log(`⚠️ Email failed to: ${toEmail}`);
      }
    })
    .catch((err) => {
      console.error(`❌ Email error:`, err.message);
    });
}

// Helper: Get admin emails
async function getAdminEmails() {
  try {
    const admins = await User.find({ role: "Admin" }).select("email");
    return admins.map(admin => admin.email);
  } catch (error) {
    console.error("Error fetching admin emails:", error);
    return process.env.DEFAULT_ADMIN_EMAIL ? [process.env.DEFAULT_ADMIN_EMAIL] : [];
  }
}

// Helper: Remove expired bookings
async function removeExpiredBookings() {
  try {
    const today = new Date();
    console.log("⏳ Running Cleanup: Checking for expired bookings...");
    
    const todayStr = today.toISOString().split('T')[0];
    console.log(todayStr);
    
    const expiredBookings = await Booking.find({ 
      date: { $lt: todayStr} 
    }).populate("teacher", "name email");
    
    if (expiredBookings.length === 0) {
      console.log("✅ No expired bookings found.");
      return { removed: 0 };
    }
    
    console.log(`🚨 Found ${expiredBookings.length} expired bookings to clean up.`);
    
    let cleanupCount = 0;
    for (const booking of expiredBookings) {
      try {
        const room = await Room.findOne({ name: booking.classroom });
        
        if (room) {
          const [startTime, endTime] = booking.timeSlot.split("-");
          const bookingDate = new Date(booking.date);
          const date = bookingDate.toISOString().split('T')[0];
          const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const bookingDay = daysOfWeek[bookingDate.getDay()]; 
          
          const initialScheduleLength = room.schedule.length;
          
          room.schedule = room.schedule.filter(entry => {
            return !(
              entry.date.toISOString().split('T')[0] === date &&
              entry.day === bookingDay && 
              entry.startTime === startTime && 
              entry.endTime === endTime &&
              (
                entry.approvalStatus === "pendingApproval" || 
                entry.approvalStatus === "approved" || 
                entry.approvalStatus === "granted"
              )
            );
          });
          
          if (initialScheduleLength > room.schedule.length) {
            await room.save();
            console.log(`🧹 Removed expired booking slot from room ${room.name}`);
          }
        }
        
        cleanupCount++;
        
      } catch (error) {
        console.error(`Error processing expired booking ${booking._id}:`, error);
      }
    }
    
    console.log(`🗑️ Successfully removed ${cleanupCount} expired bookings!`);
    return { removed: cleanupCount };
    
  } catch (error) {
    console.error("🚨 Error in removing expired bookings:", error);
    throw error;
  }
}

// 📌 TEST EMAIL ROUTE (for debugging)
router.get("/test-email", authenticateUser, authorizeRole(["Admin", "HOD"]), async (req, res) => {
  try {
    const testEmail = req.user.email || process.env.EMAIL_USER;
    const subject = "Test Email - Room Booking System";
    const message = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify your SMTP configuration.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Config Used:</strong> ${lastSuccessfulConfig?.name || 'Default'}</p>
        <p>If you received this, your email system is working correctly!</p>
      </div>
    `;
    
    console.log("\n🧪 Testing email configuration...\n");
    const result = await sendEmailNotification(testEmail, subject, message);
    
    res.json({ 
      success: result,
      config: lastSuccessfulConfig?.name || 'Default',
      message: result ? "Email test passed!" : "Email test failed - check server logs"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 📌 Teacher Requests a Booking
router.post("/", authenticateUser, async (req, res) => {
  try {
    console.log("Received booking request:", req.body);
    
    const { roomId, date, day, timeSlot, purpose, subject, faculty, class: classInfo } = req.body;
    
    console.log("Booking date received:", date);
    console.log("Current date:", new Date().toISOString());
    
    if (date) {
      const bookingDate = new Date(date);
      const currentDate = new Date();
      
      const bookingDateStr = bookingDate.toISOString().split('T')[0];
      const currentDateStr = currentDate.toISOString().split('T')[0];
      
      console.log("Booking date (date only):", bookingDateStr);
      console.log("Current date (date only):", currentDateStr);
      
      if (new Date(bookingDateStr) <= new Date(currentDateStr)) {
        console.log("Rejecting booking: date is in the past");
        return res.status(400).json({ 
          error: "Booking date cannot be in the past." 
        });
      }
    }
    
    console.log("Step 1: Checking existing bookings");
    
    const existingBooking = await Booking.findOne({
      classroom: roomId,
      date,
      timeSlot,
      status: { $ne: "Rejected" },
    });
    
    if (existingBooking) {
      return res.status(400).json({ error: "This time slot is already booked." });
    }
    
    console.log("Step 2: Creating new booking");
    const booking = new Booking({
      teacher: req.user.id,
      classroom: roomId,
      date,
      day,
      timeSlot,
      purpose,
      status: "Pending",
      hodStatus: "Pending",
    });
    
    await booking.save();
    console.log("Step 3: Booking saved successfully!");
    
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
    });
    
    await room.save();
    console.log("Step 6: Room schedule updated successfully");
    
    res.status(201).json({ message: "Booking request submitted!", booking });
    
    // Send email asynchronously
    const formattedDate = new Date(date).toLocaleDateString();
    getAdminEmails()
      .then(adminEmails => {
        console.log("📮 Admin emails fetched:", adminEmails);
        if (adminEmails && adminEmails.length > 0) {
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
              
              <p>Please log in to the admin dashboard to approve or reject this request.</p>
              <p><a href="https://bookingsystem-bay.vercel.app" style="display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px;margin-top:10px;">Go to Dashboard</a></p>
              <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message. Please do not reply to this email.</p>
            </div>
          `;
          
          sendEmailAsync(adminEmails, emailSubject, emailMessage);
        } else {
          console.log("⚠️ No admin emails found");
        }
      })
      .catch(err => console.error("⚠️ Error fetching admin emails:", err));
  } catch (error) {
    console.error("🚨 Error in booking:", error.message);
    res.status(500).json({ error: "Server error while processing booking." });
  }
});

// 📌 Get All Bookings
router.get("/", authenticateUser, authorizeRole(["Admin", "HOD"]), async (req, res) => {
  try {
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

    const room = await Room.findOne({ name: booking.classroom });
    if (room) {
      const [startTime, endTime] = booking.timeSlot.split("-");
      const bookingDate = new Date(booking.date);
      const date = bookingDate.toISOString().split('T')[0];
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const bookingDay = daysOfWeek[bookingDate.getUTCDay()];

      room.schedule = room.schedule.map((entry) => {
        if (entry.day === bookingDay && entry.startTime === startTime && entry.endTime === endTime && entry.date.toISOString().split('T')[0] === date) {
          return { ...entry, subject: "Approved by Admin", approvalStatus: "approved" };
        }
        return entry;
      });

      await room.save();
    }

    booking.status = "Approved by Admin";
    booking.hodStatus = "Pending";
    await booking.save();

    res.json({ message: "Booking approved by admin", booking });

    // Send emails
    User.find({ role: "HOD" }).select("email").then(hods => {
      const hodEmails = hods.map(hod => hod.email);
      
      if (hodEmails && hodEmails.length > 0) {
        const bookingDate = new Date(booking.date);
        const formattedDate = bookingDate.toLocaleDateString();
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const bookingDay = daysOfWeek[bookingDate.getUTCDay()];
        
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
            
            <p>Please log in to the HOD dashboard to grant or reject this booking.</p>
            <p><a href="https://bookingsystem-bay.vercel.app" style="display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px;margin-top:10px;">Go to Dashboard</a></p>
            <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message.</p>
          </div>
        `;
        
        sendEmailAsync(hodEmails, emailSubject, emailMessage);
      }
      
      const teacherEmailSubject = "Your Booking Request Approved by Admin";
      const teacherEmailMessage = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;">
          <h2 style="color: #2c3e50;">Your Booking Request Approved by Admin</h2>
          <p>Good news! Your booking request has been approved by the admin:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Room:</strong> ${booking.classroom}</p>
            <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
            <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
            <p><strong>Purpose:</strong> ${booking.purpose}</p>
            <p><strong>Status:</strong> Approved by Admin, Awaiting HOD Approval</p>
          </div>
          
          <p>You will be notified once the HOD has made their decision.</p>
        </div>
      `;
      
      sendEmailAsync(booking.teacher.email, teacherEmailSubject, teacherEmailMessage);
    }).catch(err => console.error("⚠️ Error sending emails:", err));
  } catch (error) {
    console.error("🚨 Error Approving Booking:", error.message);
    res.status(500).json({ error: "Server error while approving booking." });
  }
});

// 📌 Admin Rejects Booking
router.put("/admin/reject/:id", authenticateUser, authorizeRole(["Admin"]), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("teacher", "name email");
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.status !== "Pending") {
      return res.status(400).json({ error: "Booking already processed" });
    }

    const room = await Room.findOne({ name: booking.classroom });
    if (room) {
      const [startTime, endTime] = booking.timeSlot.split("-");
      const bookingDate = new Date(booking.date);
      const date = bookingDate.toISOString().split('T')[0];
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const bookingDay = daysOfWeek[bookingDate.getUTCDay()];

      room.schedule = room.schedule.filter(
        (entry) => !(entry.day === bookingDay && entry.startTime === startTime && entry.endTime === endTime && entry.date.toISOString().split('T')[0] === date)
      );

      await room.save();
    }

    booking.status = "Rejected";
    booking.hodStatus = "N/A";
    await booking.save();

    res.json({ message: "Booking rejected by admin", booking });

    const emailSubject = "Your Booking Request Has Been Rejected";
    const emailMessage = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;">
        <h2 style="color: #e74c3c;">Your Booking Request Has Been Rejected</h2>
        <p>We regret to inform you that your booking request has been rejected:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Room:</strong> ${booking.classroom}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
          <p><strong>Purpose:</strong> ${booking.purpose}</p>
        </div>
        
        <p>If you have questions, please contact the administration.</p>
      </div>
    `;
    
    sendEmailAsync(booking.teacher.email, emailSubject, emailMessage);
  } catch (error) {
    console.error("🚨 Error Rejecting Booking:", error.message);
    res.status(500).json({ error: "Server error while rejecting booking." });
  }
});

// 📌 HOD Grants Booking
router.put("/hod/grant/:id", authenticateUser, authorizeRole(["HOD"]), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("teacher", "name email");
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.status !== "Approved by Admin") {
      return res.status(400).json({ error: "Booking must be approved by admin first" });
    }

    booking.hodStatus = "Granted";
    await booking.save();

    const room = await Room.findOne({ name: booking.classroom });
    if (room) {
      const [startTime, endTime] = booking.timeSlot.split("-");
      const bookingDate = new Date(booking.date);
      const date = bookingDate.toISOString().split('T')[0];
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const bookingDay = daysOfWeek[bookingDate.getUTCDay()];

      room.schedule = room.schedule.map((entry) => {
        if (entry.day === bookingDay && entry.startTime === startTime && entry.endTime === endTime && entry.date.toISOString().split('T')[0] === date) {
          return { ...entry, subject: booking.purpose, faculty: booking.teacher.name, approvalStatus: "granted" };
        }
        return entry;
      });

      await room.save();
    }

    res.json({ message: "Booking granted by HOD", booking });

    const emailSubject = "Your Booking Has Been Granted";
    const bookingDate = new Date(booking.date);
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const bookingDay = daysOfWeek[bookingDate.getUTCDay()];
    
    const emailMessage = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;">
        <h2 style="color: #27ae60;">Your Booking Has Been Granted</h2>
        <p>Good news! Your booking request has been fully approved:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Room:</strong> ${booking.classroom}</p>
          <p><strong>Date:</strong> ${bookingDate.toLocaleDateString()}</p>
          <p><strong>Day:</strong> ${bookingDay}</p>
          <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
          <p><strong>Purpose:</strong> ${booking.purpose}</p>
          <p><strong>Status:</strong> Granted</p>
        </div>
        
        <p>The room has been allocated for your use.</p>
      </div>
    `;
    
    sendEmailAsync(booking.teacher.email, emailSubject, emailMessage);
  } catch (error) {
    console.error("🚨 Error Granting Booking:", error.message);
    res.status(500).json({ error: "Server error while granting booking." });
  }
});

// 📌 HOD Rejects Booking
router.put("/hod/reject/:id", authenticateUser, authorizeRole(["HOD"]), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("teacher", "name email");
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.status !== "Approved by Admin") {
      return res.status(400).json({ error: "Booking must be approved by admin first" });
    }

    const room = await Room.findOne({ name: booking.classroom });
    if (room) {
      const [startTime, endTime] = booking.timeSlot.split("-");
      const bookingDate = new Date(booking.date);
      const date = bookingDate.toISOString().split('T')[0];
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const bookingDay = daysOfWeek[bookingDate.getUTCDay()];

      room.schedule = room.schedule.filter(
        (entry) => !(entry.day === bookingDay && entry.startTime === startTime && entry.endTime === endTime && entry.date.toISOString().split('T')[0] === date)
      );

      await room.save();
    }

    booking.hodStatus = "Rejected";
    await booking.save();

    res.json({ message: "Booking rejected by HOD", booking });

    const emailSubject = "Your Booking Request Has Been Rejected by HOD";
    const emailMessage = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;">
        <h2 style="color: #e74c3c;">Your Booking Request Rejected by HOD</h2>
        <p>We regret to inform you that your booking request has been rejected by the HOD:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Room:</strong> ${booking.classroom}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
          <p><strong>Purpose:</strong> ${booking.purpose}</p>
          <p><strong>Status:</strong> Rejected by HOD</p>
        </div>
        
        <p>If you have questions, please contact the department head.</p>
      </div>
    `;
    
    sendEmailAsync(booking.teacher.email, emailSubject, emailMessage);
  } catch (error) {
    console.error("🚨 Error Rejecting Booking:", error.message);
    res.status(500).json({ error: "Server error while rejecting booking." });
  }
});

// 📌 Get Bookings for a Teacher
router.get("/teacher", authenticateUser, async (req, res) => {
  try {
    const bookings = await Booking.find({ teacher: req.user.id }).populate("teacher", "name email");
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📌 Delete All Bookings (HOD only)
router.delete("/delete-all", authenticateUser, authorizeRole(["HOD"]), async (req, res) => {
  try {
    const bookings = await Booking.find();
    console.log(`Found ${bookings.length} bookings to delete`);
    
    for (const booking of bookings) {
      try {
        const room = await Room.findOne({ name: booking.classroom });
        if (room) {
          const [startTime, endTime] = booking.timeSlot.split("-");
          const bookingDate = new Date(booking.date);
          const date = bookingDate.toISOString().split('T')[0];
          const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const bookingDay = daysOfWeek[bookingDate.getUTCDay()];

          const initialLength = room.schedule.length;
          room.schedule = room.schedule.filter(entry => {
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
              return true;
            }
          });

          if (initialLength !== room.schedule.length) {
            console.log(`Removed ${initialLength - room.schedule.length} slots from room ${room.name}`);
            await room.save();
          }
        }
      } catch (roomError) {
        console.error(`Error processing room for booking ${booking._id}:`, roomError);
      }
    }

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