const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// ============================================
// CONFIGURE CLOUDINARY
// ============================================
exports.configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("❌ CLOUDINARY ERROR: Missing credentials!");
    return;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  // console.log("✅ Cloudinary configured for cloud:", cloudName);
};

// ============================================
// UPLOAD IMAGE (Writing Task 1 Diagrams)
// ============================================
exports.uploadImage = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // console.log("📤 Uploading image:", req.file.originalname);

    // Check if Cloudinary credentials exist in environment
    const hasCloudinary = process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

    if (hasCloudinary) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "ielts-lms/writing-tasks",
        resource_type: "image",
        transformation: [
          { width: 1200, height: 800, crop: "limit" }, // Max size
          { quality: "auto" }, // Auto optimize
          { fetch_format: "auto" }, // Auto format (webp if supported)
        ],
      });

      // Keep the local file as a backup! (Removed fs.unlinkSync)

      // Return URL
      return res.json({
        message: "Image uploaded successfully to Cloud",
        url: result.secure_url,
        publicId: result.public_id,
      });
    } else {
      // Fallback: Local Storage
      // Multer already saved the file to uploads/, we just return the URL
      const localUrl = `/${req.file.path.replace(/\\/g, '/')}`;
      
      return res.json({
        message: "Image uploaded locally (Hybrid Mode)",
        url: localUrl,
        publicId: null,
      });
    }
  } catch (error) {
    console.error("❌ Upload image error:", error);

    // Clean up temp file if exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: "Image upload failed",
      details: error.message,
    });
  }
};

// ============================================
// UPLOAD AUDIO (Listening Tests + Speaking Responses)
// ============================================
exports.uploadAudio = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // console.log("📤 Uploading audio:", req.file.originalname);

    // Check if Cloudinary credentials exist in environment
    const hasCloudinary = process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

    if (hasCloudinary) {
      // Upload to Cloudinary (audio counts as 'video' resource_type)
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "ielts-lms/audio",
        resource_type: "video", // Audio files use 'video' type
        format: "mp3", // Convert to mp3
      });

      // Keep the local file as a backup! (Removed fs.unlinkSync)

      // Return Cloudinary URL
      return res.json({
        message: "Audio uploaded successfully to Cloud",
        url: result.secure_url,
        publicId: result.public_id,
        duration: result.duration, // Audio length in seconds
      });
    } else {
      // Fallback: Local Storage
      // Multer already saved the file to uploads/, we just return the URL
      const localUrl = `/${req.file.path.replace(/\\/g, '/')}`;
      
      return res.json({
        message: "Audio uploaded locally (Hybrid Mode)",
        url: localUrl,
        publicId: null,
      });
    }
  } catch (error) {
    console.error("❌ Upload audio error:", error);

    // Clean up temp file if exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: "Audio upload failed",
      details: error.message,
    });
  }
};

// ============================================
// DELETE FILE (Optional - for cleanup)
// ============================================
exports.deleteFile = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: "Public ID required" });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // console.log("🗑️ File deleted:", publicId);

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("❌ Delete file error:", error);
    res.status(500).json({
      error: "File deletion failed",
      details: error.message,
    });
  }
};
