# Email Configuration Setup

To enable email functionality for password reset, you need to configure the following environment variables:

## Required Environment Variables

Add these to your `.env` file in the backend directory:

```env
# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `EMAIL_PASSWORD`

## Alternative Email Services

You can also use other email services by modifying the transporter configuration in `utils/emailService.js`:

### Outlook/Hotmail
```javascript
const transporter = nodemailer.createTransporter({
  service: 'hotmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

### Yahoo
```javascript
const transporter = nodemailer.createTransporter({
  service: 'yahoo',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

### Custom SMTP
```javascript
const transporter = nodemailer.createTransporter({
  host: 'your-smtp-server.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

## Testing

1. Set up your environment variables
2. Start the backend server
3. Try the forgot password functionality
4. Check your email for the reset link

## Production Considerations

- Use a dedicated email service like SendGrid, Mailgun, or AWS SES for production
- Set up proper error handling and logging
- Consider rate limiting for password reset requests
- Use environment-specific email templates
