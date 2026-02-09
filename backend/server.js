const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
// MongoDB Connection
if (process.env.NODE_ENV !== "test") {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Error:", err));
}

// Routes
const authRoutes = require("./routes/authRoutes");
const questionRoutes = require("./routes/questionRoutes");
const resultRoutes = require("./routes/resultRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const testRoutes = require("./routes/testRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const uploadController = require("./controllers/uploadController");

//use routes
app.use("/api/auth", authRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/upload", uploadRoutes);

uploadController.configureCloudinary();

// Test Route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working!" });
});

// Global Error Handler (MUST be last middleware)
app.use(errorHandler);

// Start Server
// Start Server
const PORT = process.env.PORT || 5000;

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;

// ==========================================
// CRASH PREVENTION (Global Error Handlers)
// ==========================================

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  // In production, you might want to restart, but for now we log it
  console.error(err);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  console.error(err);
  // process.exit(1); // Optional: Restart via process manager (PM2) in prod
});
