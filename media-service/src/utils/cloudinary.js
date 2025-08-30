import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import logger from "./logger.js";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          logger.error(`Error uploading file to Cloudinary: ${error.message}`);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(file.buffer); // Pass the file buffer
  });
};

const deleteMediaFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Successfully deleted file from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    logger.error(`Error deleting file from Cloudinary: ${error.message}`);
    throw error;
  }
};

export { uploadToCloudinary , deleteMediaFromCloudinary };
