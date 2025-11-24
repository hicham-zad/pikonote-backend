import cloudinary from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.v2.config({
  cloud_name: "dts6uuq9v",
  api_key: "171172759612827",
  api_secret: process.env.API_SECRET,
});

// Fast upload options
const fastOpts = {
  resource_type: "auto",
  format: "webp",
  quality: "auto:good", // Faster than "auto:best"
  invalidate: false, // Don't invalidate CDN unless needed
  timeout: 30000, // 30 second timeout
  eager: [
    { width: 800, height: 600, crop: "limit" } // Pre-generate common size
  ],
  eager_async: true // Generate transformations in background
};


// Single upload with retry
const uploadImage = async (image, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await cloudinary.v2.uploader.upload(image, fastOpts);
      return result.secure_url;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`Upload failed after ${retries + 1} attempts: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
};

export { uploadImage };