const nodemailer = require('nodemailer');

// Production-optimized email service for cloud platforms like Render
const createProductionTransporter = () => {
  return nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Production-optimized settings for cloud platforms
    secure: true,
    tls: {
      rejectUnauthorized: false
    },
    // Extended timeouts for cloud environments
    connectionTimeout: 120000, // 2 minutes
    greetingTimeout: 60000, // 1 minute
    socketTimeout: 120000, // 2 minutes
    // Pool settings for better connection management
    pool: true,
    maxConnections: 1,
    maxMessages: 3,
    rateLimit: 14, // 14 emails per minute (Gmail limit)
    // Debug for production troubleshooting
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development'
  });
};

// Send password reset email with production optimizations
const sendPasswordResetEmailProduction = async (email, resetToken, userName) => {
  const maxRetries = 5;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📮 Email attempt ${attempt}/${maxRetries} for ${email}`);
      
      const transporter = createProductionTransporter();
      
      // Skip verification in production to avoid timeout issues
      // await transporter.verify();
      
      const resetLink = `${process.env.FRONTEND_URL || 'https://bookingsystem-bay.vercel.app'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"DJSCE IT Department" <${process.env.EMAIL_USER}>`,
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
      console.log(`✉️ Password reset email sent successfully to ${email} [${info.messageId}]`);
      return { success: true, messageId: info.messageId };
      
    } catch (error) {
      lastError = error;
      console.error(`📮 Email attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.code === 'EAUTH' || error.code === 'EENVELOPE') {
        console.error("❌ Authentication or envelope error - not retrying");
        break;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  console.error("📮 All email attempts failed:", lastError);
  return { success: false, error: lastError.message };
};

module.exports = {
  sendPasswordResetEmailProduction
};
