# Gmail SMTP Setup for Render

## 🔧 Required Setup Steps

### 1️⃣ Enable 2-Step Verification in Google Account
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click **"2-Step Verification"**
3. Follow the setup process to enable 2FA

### 2️⃣ Create Gmail App Password
1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select:
   - **App:** Mail
   - **Device:** Other (Custom name) → "Render Booking System"
3. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)
   - ⚠️ **This is your SMTP password** - NOT your regular Gmail password

### 3️⃣ Update Render Environment Variables
In your Render Dashboard → Environment tab:

| Key | Value | Description |
|-----|-------|-------------|
| `EMAIL_USER` | `your_email@gmail.com` | Your Gmail address |
| `EMAIL_PASSWORD` | `abcd efgh ijkl mnop` | The App Password from step 2 |

### 4️⃣ Gmail SMTP Configuration
✅ **Port 587 (TLS)** - Allowed on Render
✅ **Port 465 (SSL)** - Allowed on Render  
❌ **Port 25** - Blocked on Render

## 🚀 How It Works

### **Notification Emails (bookings.js):**
- Uses Gmail SMTP with App Password
- Port 587 with TLS encryption
- Works for booking confirmations, approvals, etc.

### **Password Reset Emails (auth.js):**
- Uses same Gmail SMTP configuration
- Same App Password authentication
- Same port and encryption settings

## 🔍 Troubleshooting

### **Common Issues:**

| Error | Cause | Solution |
|-------|-------|----------|
| `EAUTH` | Using regular Gmail password | Use App Password instead |
| `ETIMEDOUT` | Wrong port or host | Use port 587, host smtp.gmail.com |
| `Connection refused` | Port 25 blocked | Use port 587 or 465 |
| `SSL Error` | Wrong encryption | Use TLS (port 587) or SSL (port 465) |

### **Test Your Setup:**
1. **Check environment variables** in Render dashboard
2. **Verify App Password** is correct (16 characters)
3. **Test notification emails** first (they should work)
4. **Test password reset** after notifications work

## 📧 Email Flow

```
User Request → Render Backend → Gmail SMTP → User's Inbox
     ↓              ↓              ↓
  Frontend    →  Node.js/Nodemailer  →  Gmail Server
```

## ✅ Success Indicators

- ✅ **Notification emails** work (booking confirmations)
- ✅ **Password reset emails** work (forgot password)
- ✅ **No connection timeouts** in Render logs
- ✅ **Emails arrive** in user inboxes

## 🔐 Security Notes

- **App Passwords** are safer than regular passwords
- **2FA required** to create App Passwords
- **Port 587/465** are secure and allowed on Render
- **TLS encryption** protects email content

---

**Need Help?** Check Render logs for detailed error messages and Gmail SMTP connection status.
