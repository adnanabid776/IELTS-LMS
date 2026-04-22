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
      try {
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

        // Return Cloudinary URL
        return res.json({
          message: "Image uploaded successfully to Cloud",
          url: result.secure_url,
          publicId: result.public_id,
        });
      } catch (cloudinaryError) {
        console.warn("⚠️ CLOUDINARY TIMEOUT/ERROR: Falling back to local storage.", cloudinaryError.message);
        
        // FALLBACK: Return local path instead of failing
        const localUrl = `/${req.file.path.replace(/\\/g, '/')}`;
        return res.json({
          message: "Image uploaded locally (Cloud Fallback)",
          url: localUrl,
          publicId: null,
          isLocal: true,
          error: cloudinaryError.message
        });
      }
    } else {
      // Fallback: Local Storage (Manual Mode)
      const localUrl = `/${req.file.path.replace(/\\/g, '/')}`;
      
      return res.json({
        message: "Image uploaded locally (Hybrid Mode)",
        url: localUrl,
        publicId: null,
      });
    }
  } catch (error) {
    console.error("❌ Critical Upload error:", error);

    // Clean up temp file ONLY if it wasn't already successfully handled as a local fallback
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      // Only delete if we didn't return a 200 response above
      if (!res.headersSent) {
        fs.unlinkSync(req.file.path);
      }
    }

    if (!res.headersSent) {
      res.status(500).json({
        error: "Image upload failed",
        details: error.message,
      });
    }
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
      try {
        // Upload to Cloudinary (audio counts as 'video' resource_type)
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "ielts-lms/audio",
          resource_type: "video", // Audio files use 'video' type
          format: "mp3", // Convert to mp3
        });

        // Return Cloudinary URL
        return res.json({
          message: "Audio uploaded successfully to Cloud",
          url: result.secure_url,
          publicId: result.public_id,
          duration: result.duration, // Audio length in seconds
        });
      } catch (cloudinaryError) {
        console.warn("⚠️ CLOUDINARY AUDIO ERROR: Falling back to local storage.", cloudinaryError.message);
        
        // FALLBACK: Return local path instead of failing
        const localUrl = `/${req.file.path.replace(/\\/g, '/')}`;
        return res.json({
          message: "Audio uploaded locally (Cloud Fallback)",
          url: localUrl,
          publicId: null,
          isLocal: true,
          error: cloudinaryError.message
        });
      }
    } else {
      // Fallback: Local Storage
      const localUrl = `/${req.file.path.replace(/\\/g, '/')}`;
      
      return res.json({
        message: "Audio uploaded locally (Hybrid Mode)",
        url: localUrl,
        publicId: null,
      });
    }
  } catch (error) {
    console.error("❌ Critical Audio Upload error:", error);

    // Clean up temp file ONLY if it wasn't already successfully handled as a local fallback
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      if (!res.headersSent) {
        fs.unlinkSync(req.file.path);
      }
    }

    if (!res.headersSent) {
      res.status(500).json({
        error: "Audio upload failed",
        details: error.message,
      });
    }
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
