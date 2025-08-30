import dotnenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import Redis from "ioredis";
import cors from "cors";
import helmet from "helmet";
import postRoutes from "./routes/post-route.js";
import logger from "./utils/logger.js";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import errorHandler from "../../identity-service/src/middlewares/errorHandler.js";
import {connectRabbitMQ} from "./utils/rabbitmq.js";

dotnenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(express.json());

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

//rate limiting for sensitive endpoint
const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Too many requests from this IP: ${req.ip}`);
    res.status(429).send("Too many requests from this IP");
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use("/api/posts/create-post", rateLimiter);
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();
    app.listen(PORT, () => {
      logger.info(`Post service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at ", promise, "reason:", reason);
});
