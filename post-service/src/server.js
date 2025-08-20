import dotnenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import Redis from "ioredis";
import cors from "cors";
import helmet from "helmet";
import postRoutes from "./routes/post-route.js";
import logger from "./utils/logger.js";
import errorHandler from "../../identity-service/src/middlewares/errorHandler.js";

dotnenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(express.json());
// app.use(errorHandler);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info("Connected to database");
  })
  .catch((error) => {
    logger.error("Mongo connection error", error.message);
  });

const redisClient = new Redis(process.env.REDIS_URL);

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request for ${req.url}`);
  logger.info(`Request body,  ${JSON.stringify(req.body)}`);
  next();
});

app.use("/api/posts", postRoutes);

app.listen(PORT, () => {
  logger.info(`Post service running on port ${PORT}`);
});
