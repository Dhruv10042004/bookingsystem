const nodemailer = require('nodemailer');

// Alternative email service using different Gmail configuration
const createAlternativeTransporter = () => {
  return nodemailer.createTransport({
    // Use Gmail's alternative SMTP settings
    host: 'smtp.gmail.com',
    port: 465, // Use SSL port instead of STARTTLS
    secure: true, // Use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Minimal configuration for cloud platforms
    tls: {
      rejectUnauthorized: false
    },
    // Very short timeouts
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000, // 5 seconds
    socketTimeout: 10000, // 10 seconds
    // No pooling
    pool: false,
    // No rate limiting
    rateLimit: false
  });
};

// Alternative email service with minimal configuration
const sendPasswordResetEmailAlternative = async (email, resetToken, userName) => {
  try {
    console.log(`📮 Alternative email service attempting to send to ${email}`);
    
    const transporter = createAlternativeTransporter();
    
    const resetLink = `${process.env.FRONTEND_URL || 'https://bookingsystem-bay.vercel.app'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER, // Use email directly without formatting
      to: email,
      subject: 'Password Reset Request - DJSCE IT Department',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password for your DJSCE IT Department account.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${resetLink}" style="background-color: #2c3e50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>If the button doesn't work, copy this link: ${resetLink}</p>
          <p><strong>Important:</strong> This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Alternative email service sent successfully to ${email} [${info.messageId}]`);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error("📮 Alternative email service failed:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmailAlternative
};
