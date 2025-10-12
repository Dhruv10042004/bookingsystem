const sgMail = require('@sendgrid/mail');

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Send password reset email using SendGrid (works on Render)
const sendPasswordResetEmailSendGrid = async (email, resetToken, userName) => {
  try {
    console.log(`📮 SendGrid attempting to send password reset email to ${email}`);
    
    const resetLink = `${process.env.FRONTEND_URL || 'https://bookingsystem-bay.vercel.app'}/reset-password?token=${resetToken}`;
    
    const msg = {
      to: email,
      from: {
        email: process.env.EMAIL_USER || 'noreply@bookingsystem.com',
        name: 'DJSCE IT Department'
      },
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

    const response = await sgMail.send(msg);
    console.log(`✉️ SendGrid email sent successfully to ${email} [${response[0].headers['x-message-id']}]`);
    return { success: true, messageId: response[0].headers['x-message-id'] };
    
  } catch (error) {
    console.error("📮 SendGrid email failed:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmailSendGrid
};
