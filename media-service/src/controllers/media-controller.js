import logger from "../utils/logger.js";
import Media from "../models/Media.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export const uploadMedia = async (req, res) => {
  logger.info("Starting media upload");
  try {
    console.log(req.file,"req.file");
    if (!req.file) {
      logger.error("No file found. Please add a file and try again!");
      return res.status(400).send({
        success: false,
        message: "No file found. Please add a file and try again!",
      });
    }
    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user;
    logger.info(
      `File details:name:${originalname},type:${mimetype},size:${buffer.byteLength}`
    );
    logger.info("Uploading to cloudinary");
    const cludinaryUploadResult = await uploadToCloudinary(req.file);
    logger.info(
      `Cloudinary upload successful. Public id: ${cludinaryUploadResult.public_id}`
    );
    const newMedia = new Media({
      publicId: cludinaryUploadResult.public_id,
      originalName:originalname,
      mimeType: mimetype,
      url: cludinaryUploadResult.secure_url,
      userId,
    });

    await newMedia.save();

    return res
      .status(201)
      .send({
        success: true,
        mediaId: newMedia._id,
        url: newMedia.url,
        message: "Media uploaded successfully",
      });
  } catch (error) {
    logger.error(`Error creating media: ${error.message}`);
    return res.status(500).send({ success: false, message: error.message });
  }
};

