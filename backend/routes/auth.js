const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Faculty = require("../models/Falculty");
const { authenticateUser } = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const { sendPasswordResetEmail } = require("../utils/emailService");
const { sendPasswordResetEmailProduction } = require("../utils/emailServiceProduction");
const { sendPasswordResetEmailAlternative } = require("../utils/emailServiceAlternative");
const { sendPasswordResetEmailSendGrid } = require("../utils/sendGridService");
const nodemailer = require("nodemailer");
const cors = require("cors");

const router = express.Router();

// CORS middleware for auth routes
router.use(cors({
  origin: [
    'http://localhost:3000',
    'https://bookingsystem-bay.vercel.app',
    'https://bookingsystem-e4oz.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
// Add this RIGHT at the top after your requires
console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_USER type:', typeof process.env.EMAIL_USER);
console.log('EMAIL_USER length:', process.env.EMAIL_USER?.length);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-4) : 'MISSING');
console.log('EMAIL_PASSWORD type:', typeof process.env.EMAIL_PASSWORD);
console.log('EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD?.length);
console.log('===================================');
// Use Gmail SMTP configuration for Render (try port 465 SSL)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465, // Use port 465 (SSL) - alternative to 587
  secure: true, // Use SSL instead of TLS
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASSWORD, // Gmail App Password (not regular password)
  },
  tls: {
    rejectUnauthorized: false
  },
  // Connection settings for Render
  connectionTimeout: 30000, // 30 seconds
  greetingTimeout: 15000, // 15 seconds
  socketTimeout: 30000, // 30 seconds
  // Debug options - uncomment if needed to troubleshoot
  // debug: true,
  // logger: true
});

const validRoles = ["Teacher", "Lab Assistant", "HOD", "Admin"];
const isHOD = (role) => role === "HOD";

// ✅ Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const faculty = await Faculty.findOne({ name });
    if (!faculty) {
      return res.status(403).json({ error: "You are not authorized to register." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role: faculty.role });

    await user.save();
    res.status(201).json({ message: "User registered successfully", role: faculty.role });
  } catch (err) {
    console.error("❌ Registration Error:", err);
    res.status(500).json({ error: "Error registering user" });
  }
});

// ✅ Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log(token);
    res.status(200).json({
      message: "Login successful",
      token,
      user: { name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ error: "Error logging in" });
  }
});

// ✅ Add Faculty (HOD only)
router.post("/add-faculty", authenticateUser, async (req, res) => {
  try {
    const { name, role } = req.body;
    if (!isHOD(req.user.role)) {
      return res.status(403).json({ error: "Only HOD can add faculty members" });
    }

    if (!name) {
      return res.status(400).json({ error: "Faculty name is required" });
    }

    const existingFaculty = await Faculty.findOne({ name });
    if (existingFaculty) {
      return res.status(400).json({ error: "Faculty already exists" });
    }

    const faculty = new Faculty({ name, role: validRoles.includes(role) ? role : "Teacher" });
    await faculty.save();

    res.status(201).json({ message: "Faculty added successfully", faculty });
  } catch (err) {
    console.error("❌ Add Faculty Error:", err);
    res.status(500).json({ error: "Error adding faculty member" });
  }
});

// ✅ Remove Faculty (HOD only)
router.delete("/remove-faculty", authenticateUser, async (req, res) => {
  try {
    const { name } = req.body;
    if (!isHOD(req.user.role)) {
      return res.status(403).json({ error: "Only HOD can remove faculty members" });
    }

    const faculty = await Faculty.findOne({ name });
    if (!faculty) {
      return res.status(404).json({ error: "Faculty member not found" });
    }

    if (faculty.role === "HOD") {
      return res.status(403).json({ error: "Cannot remove HOD from faculty list" });
    }

    await Faculty.deleteOne({ name });
    await User.deleteOne({ name }); // Optional: remove user login if exists

    res.status(200).json({ message: "Faculty removed successfully", facultyName: name });
  } catch (err) {
    console.error("❌ Remove Faculty Error:", err);
    res.status(500).json({ error: "Error removing faculty member" });
  }
});

// ✅ Update Faculty (HOD only)
router.put("/update-faculty", authenticateUser, async (req, res) => {
  try {
    const { oldName, newName, role } = req.body;
    if (!isHOD(req.user.role)) {
      return res.status(403).json({ error: "Only HOD can update faculty members" });
    }

    const faculty = await Faculty.findOne({ name: oldName });
    if (!faculty) {
      return res.status(404).json({ error: "Faculty member not found" });
    }

    if (faculty.role === "HOD" && role !== "HOD") {
      return res.status(403).json({ error: "Cannot change HOD's role" });
    }

    // Check if new name already exists (if name is being changed)
    if (newName && newName !== oldName) {
      const existingFaculty = await Faculty.findOne({ name: newName });
      if (existingFaculty) {
        return res.status(400).json({ error: "Faculty with this name already exists" });
      }
    }

    // Update faculty details
    faculty.name = newName || oldName;
    faculty.role = validRoles.includes(role) ? role : faculty.role;
    await faculty.save();

    // Update user details if user exists
    const user = await User.findOne({ name: oldName });
    if (user) {
      user.name = newName || oldName;
      user.role = faculty.role;
      await user.save();
    }

    res.status(200).json({ message: "Faculty updated successfully", faculty });
  } catch (err) {
    console.error("❌ Update Faculty Error:", err);
    res.status(500).json({ error: "Error updating faculty member" });
  }
});

// ✅ Get All Faculty (optional auth for HOD flag)
router.get("/faculty-list", optionalAuth, async (req, res) => {
  try {
    const user = req.user;
    const isHodRequest = user && isHOD(user.role);

    const facultyList = await Faculty.find({});
    const registeredUsers = await User.find({}, "name");
    const registeredNames = registeredUsers.map(user => user.name);

    const result = facultyList.map(faculty => ({
      name: faculty.name,
      role: faculty.role,
      isRegistered: isHodRequest ? registeredNames.includes(faculty.name) : undefined,
    }));

    res.status(200).json({ facultyList: result });
  } catch (err) {
    console.error("❌ Get Faculty List Error:", err);
    res.status(500).json({ error: "Error retrieving faculty list" });
  }
});

// ✅ Forgot Password - Request Password Reset
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found with this email" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(resetTokenExpiry);
    await user.save();

    // Send password reset email using Gmail (same as working notification emails)
    try {
      console.log("📮 Using Gmail for password reset email (same as notification emails)...");
      console.log("📮 Environment check:", {
        NODE_ENV: process.env.NODE_ENV,
        EMAIL_USER: process.env.EMAIL_USER ? "✅ Set" : "❌ Missing",
        EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? "✅ Set" : "❌ Missing"
      });
      
      // Skip verification to avoid timeout on Render
      console.log("📮 Skipping Gmail connection verification for Render compatibility...");
      
      const resetLink = `${process.env.FRONTEND_URL || 'https://bookingsystem-bay.vercel.app'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"DJSCE IT Department" <${process.env.EMAIL_USER}>`, // Formatted sender name
        to: email,
        subject: 'Password Reset Request - DJSCE IT Department',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">DJSCE IT Department</h1>
              <p style="margin: 5px 0 0 0; font-size: 16px;">Password Reset Request</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
              <h2 style="color: #2c3e50; margin-top: 0;">Hello ${user.name},</h2>
              
              <p style="color: #555; line-height: 1.6; font-size: 16px;">
                We received a request to reset your password for your DJSCE IT Department account.
              </p>
              
              <p style="color: #555; line-height: 1.6; font-size: 16px;">
                Click the button below to reset your password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background-color: #2c3e50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #777; font-size: 14px; line-height: 1.5;">
                If the button doesn't work, you can copy and paste this link into your browser:
              </p>
              <p style="color: #2c3e50; font-size: 14px; word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">
                ${resetLink}
              </p>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  <strong>Important:</strong> This link will expire in 1 hour for security reasons.
                </p>
              </div>
              
              <p style="color: #777; font-size: 14px; line-height: 1.5;">
                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                This email was sent from DJSCE IT Department Booking System.<br>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Password reset email sent to ${email} [${info.messageId}]`);
      
      res.status(200).json({ 
        message: "Password reset link has been sent to your email address",
        expiresIn: "1 hour"
      });
      
    } catch (emailError) {
      console.error("📮 Error sending password reset email:", emailError);
      
      // Provide more detailed error information (same as bookings.js)
      if (emailError.code === 'EAUTH') {
        console.error("❌ Authentication failed: Check your email credentials");
      } else if (emailError.code === 'ESOCKET') {
        console.error("❌ Network error: Check your internet connection");
      } else if (emailError.code === 'ETIMEDOUT') {
        console.error("❌ Connection timeout: Gmail SMTP server is not responding");
      }
      
      res.status(500).json({ 
        error: "Failed to send password reset email. Please try again later.",
        // In development, you might want to return the token for testing
        ...(process.env.NODE_ENV === 'development' && { resetToken: resetToken })
      });
    }

  } catch (err) {
    console.error("❌ Forgot Password Error:", err);
    res.status(500).json({ error: "Error processing password reset request" });
  }
});

// ✅ Reset Password - Set New Password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });

  } catch (err) {
    console.error("❌ Reset Password Error:", err);
    res.status(500).json({ error: "Error resetting password" });
  }
});

// ✅ Change Password (for logged-in users)
router.post("/change-password", authenticateUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });

  } catch (err) {
    console.error("❌ Change Password Error:", err);
    res.status(500).json({ error: "Error changing password" });
  }
});

module.exports = router;
