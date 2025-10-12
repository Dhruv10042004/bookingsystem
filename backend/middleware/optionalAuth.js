const jwt = require("jsonwebtoken");

module.exports = function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      console.warn("Invalid or expired token. Proceeding as guest.");
    }
  }

  next();
};
