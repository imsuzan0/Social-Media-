import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import mediaRoutes from "./routes/media-route.js";
import logger from "./utils/logger.js";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { errorHandler } from "./middlewares/errorHandler.js";
import Redis from "ioredis";
import { connectRabbitMQ, consumeEvent } from "./utils/rabbitmq.js";
import  {handlePostDeleted}  from "./eventHandlers/media-event-handler.js";

const redisClient = new Redis(process.env.REDIS_URL);
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info("Database connected");
  })
  .catch((error) => {
    logger.error("Database connection failed", error.message);
  });

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request for ${req.url}`);
  logger.info(`Request body,  ${JSON.stringify(req.body)}`);
  next();
});

const rateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
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

app.use("/api/media", rateLimiter);

app.use("/api/media", mediaRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();

    //consume all the event 
    await consumeEvent("post.deleted",handlePostDeleted)

    app.listen(PORT, () => {
      logger.info(`Media service is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(
      "Could not start server due to RabbitMQ connection failure",
      error
    );
    process.exit(1);
  }
}
startServer();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at ", promise, "reason:", reason);
});
