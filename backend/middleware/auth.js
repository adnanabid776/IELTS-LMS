const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");

// ============================================
// AUTHENTICATION MIDDLEWARE WITH SESSION VALIDATION
// ============================================
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token, authorization denied" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Get user from database
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        error: "Account has been deactivated",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    // Check if this token matches the active session token
    if (user.activeSessionToken !== tokenHash) {
      console.warn(
        `❌ Session invalidated for user ${user.email}. Token mismatch.`,
      );

      return res.status(401).json({
        error: "Session expired. You have been logged in from another device.",
        code: "SESSION_INVALIDATED",
      });
    }

    // Token is valid and matches active session
    req.user = decoded; // JWT payload (userId, role)
    req.userDoc = user; // Full user document (if needed)

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token has expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }

    // Generic error
    console.error("Auth middleware error:", error);
    res.status(401).json({
      error: "Authentication failed",
      code: "AUTH_FAILED",
    });
  }
};

module.exports = authMiddleware;
