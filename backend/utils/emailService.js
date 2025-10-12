const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "Gmail", // Use environment variable or default to gmail
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
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    const transporter = createTransporter();
    
    // Verify transporter connection before sending
    await transporter.verify();
    
    // Create reset link (you'll need to update this with your frontend URL)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
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
            <h2 style="color: #2c3e50; margin-top: 0;">Hello ${userName},</h2>
            
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
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error("📮 Error sending password reset email:", error);
    
    // Provide more detailed error information
    if (error.code === 'EAUTH') {
      console.error("❌ Authentication failed: Check your email credentials");
    } else if (error.code === 'ESOCKET') {
      console.error("❌ Network error: Check your internet connection");
    }
    
    return { success: false, error: error.message };
  }
};

// Send welcome email (optional)
const sendWelcomeEmail = async (email, userName) => {
  try {
    const transporter = createTransporter();
    
    // Verify transporter connection before sending
    await transporter.verify();
    
    const mailOptions = {
      from: `"DJSCE IT Department" <${process.env.EMAIL_USER}>`, // Formatted sender name
      to: email,
      subject: 'Welcome to DJSCE IT Department Booking System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Welcome to DJSCE IT Department</h1>
            <p style="margin: 5px 0 0 0; font-size: 16px;">Booking System</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
            <h2 style="color: #2c3e50; margin-top: 0;">Hello ${userName},</h2>
            
            <p style="color: #555; line-height: 1.6; font-size: 16px;">
              Welcome to the DJSCE IT Department Booking System! Your account has been successfully created.
            </p>
            
            <p style="color: #555; line-height: 1.6; font-size: 16px;">
              You can now:
            </p>
            
            <ul style="color: #555; line-height: 1.8; font-size: 16px;">
              <li>Book rooms and labs for your classes</li>
              <li>View the department timetable</li>
              <li>Manage your booking requests</li>
              <li>Access all system features based on your role</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background-color: #2c3e50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                Login to Your Account
              </a>
            </div>
            
            <p style="color: #777; font-size: 14px; line-height: 1.5;">
              If you have any questions or need assistance, please contact the IT Department.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Welcome email sent to ${email} [${info.messageId}]`);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error("📮 Error sending welcome email:", error);
    
    // Provide more detailed error information
    if (error.code === 'EAUTH') {
      console.error("❌ Authentication failed: Check your email credentials");
    } else if (error.code === 'ESOCKET') {
      console.error("❌ Network error: Check your internet connection");
    }
    
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
};
