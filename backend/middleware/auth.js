const jwt = require("jsonwebtoken");
const User = require("../models/User");
// Middleware to authenticate user
function authenticateUser(req, res, next) {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  console.log("🔍 Token Received:", token);

  try {
    if (!process.env.JWT_SECRET) {
      console.error("🚨 JWT_SECRET is missing in environment variables.");
      return res.status(500).json({ error: "Server error: Missing JWT secret." });
    }

    // ✅ Verify the token
    const decodedUser = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Decoded User:", decodedUser);

    if (!decodedUser || !decodedUser.id || !decodedUser.role) {
      console.log(1)
      return res.status(403).json({ error: "Access Denied. Invalid user data." });
    }
    console.log(2)
    // ✅ Fetch the user from the database to get latest details
    User.findById(decodedUser.id)
      .select("name email role") // Only fetch necessary fields
      .then(user => {
        if (!user) {
          return res.status(404).json({ error: "User not found." });
        }

        req.user = {
          id: user._id,
          role: user.role,
          name: user.name,
          email: user.email
        };

        console.log("✅ User Data Attached to req.user:", req.user);
        next();
      })
      .catch(err => {
        console.error("🚨 Error fetching user:", err.message);
        return res.status(500).json({ error: "Server error while fetching user details." });
      });

  } catch (err) {
    console.error("🚨 Token Verification Failed:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired. Please log in again." });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token. Please log in again." });
    }

    return res.status(401).json({ error: "Authentication failed." });
  }
}

// Middleware to check if user has a specific role
function authorizeRole(roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: "Access Denied. No role assigned." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access Denied. Only ${roles.join(" / ")} allowed.` });
    }

    next();
  };
}
// middleware/auth.js

// const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;


module.exports = { authenticateUser, authorizeRole };
