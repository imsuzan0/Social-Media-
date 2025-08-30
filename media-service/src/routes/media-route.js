import express from "express";
import multer from "multer";
import { getAllMedias, uploadMedia } from "../controllers/media-controller.js";
import { authenticateRequest } from "../middlewares/auth-middleware.js";
import logger from "../utils/logger.js";

const router = express.Router();

//configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error(`Multer error: ${err.message}`);
        return res.status(400).send({
          success: false,
          message: "Multer error: " + err.message,
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error(`Unknown error: ${err.message}`);
        return res.status(500).send({
          success: false,
          message: "Unknown error: " + err.message,
          error: err.message,
          stack: err.stack,
        });
      }
      if (!req.file) {
        logger.error("No file found. Please add a file and try again!");
        return res.status(400).send({
          success: false,
          message: "No file found. Please add a file and try again!",
        });
      }
      next();
    });
  },
  uploadMedia
);

router.get("/all", authenticateRequest, getAllMedias);
export default router;
