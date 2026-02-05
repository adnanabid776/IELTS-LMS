const express = require("express");
const router = express.Router();
const multer = require("multer");
const uploadController = require("../controllers/uploadController");
const authMiddleware = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// MULTER CONFIGURATION

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Temp folder
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed!"), false);
  }
};

// File filter for audio
const audioFilter = (req, file, cb) => {
  console.log("📁 Received file:", file.originalname, "MIME:", file.mimetype);

  // Accept audio/*, video/* (for audio in video container), and application/octet-stream (some browsers)
  if (
    file.mimetype.startsWith("audio/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype === "application/octet-stream" ||
    file.originalname.endsWith(".webm") ||
    file.originalname.endsWith(".mp3") ||
    file.originalname.endsWith(".wav")
  ) {
    cb(null, true);
  } else {
    console.log("❌ Rejected file type:", file.mimetype);
    cb(
      new Error("Only audio files allowed! Received: " + file.mimetype),
      false,
    );
  }
};

// Multer instances
const uploadImage = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const uploadAudio = multer({
  storage: storage,
  fileFilter: audioFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for audio
});

// ============================================
// ROUTES
// ============================================

// All routes require authentication
router.use(authMiddleware);

// Upload image (Teachers/Admins only)
router.post(
  "/image",
  roleCheck("teacher", "admin"),
  uploadImage.single("image"),
  uploadController.uploadImage,
);

// Upload audio (Teachers/Admins for Listening tests, Students for Speaking)
router.post(
  "/audio",
  uploadAudio.single("audio"),
  uploadController.uploadAudio,
);

// Delete file (Teachers/Admins only)
router.delete(
  "/file",
  roleCheck("teacher", "admin"),
  uploadController.deleteFile,
);

module.exports = router;
