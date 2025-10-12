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
app.use(cors({
  origin: [
    'http://localhost:3000', // Local development
    'https://bookingsystem-bay.vercel.app', // Your Vercel frontend
    'https://bookingsystem-e4oz.onrender.com' // Your Render backend (for testing)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_ATLAS_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/rooms",roomsRoutes)
// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
