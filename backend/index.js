require('dotenv').config();

// Now add debug to verify it loaded
console.log('🔍 Environment Variables Loaded:');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/bookings");
const roomsRoutes=require("./routes/rooms")
const Falculty=require("./models/Falculty");
dotenv.config();
const app = express();

// Middleware
app.use(express.json());

// CORS configuration to allow your Vercel frontend
// CORS: use env-driven whitelist (comma-separated) with safe defaults
const rawAllowed = process.env.ALLOWED_ORIGINS || '';
const envOrigins = rawAllowed.split(',').map(s => s.trim()).filter(Boolean);
const defaultOrigins = [
  'http://localhost:3000',
  'https://bookingsystem-bay.vercel.app',
  'https://bookingsystem-e4oz.onrender.com'
];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server or curl
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    try {
      if (origin.endsWith('.vercel.app')) return callback(null, true); // allow dynamic Vercel domains
    } catch (e) {}
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Connect to MongoDB with optimized connection pooling for Render
mongoose
  .connect(process.env.MONGO_ATLAS_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // How long to try to connect
    socketTimeoutMS: 45000, // How long to wait for responses
    connectTimeoutMS: 10000, // Initial connection timeout
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/rooms",roomsRoutes)

// Debug endpoint: show active CORS allowlist and whether the requester origin is allowed
app.get('/api/cors', (req, res) => {
  const origin = req.get('Origin') || null;
  let allowed = true;
  if (origin) {
    allowed = allowedOrigins.indexOf(origin) !== -1;
    try {
      if (!allowed && origin.endsWith('.vercel.app')) allowed = true;
    } catch (e) {}
  }
  res.json({ allowedOrigins, requestOrigin: origin, allowed });
});
// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
