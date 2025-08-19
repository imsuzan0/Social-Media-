import express from "express";
import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import helmet from "helmet";
import cors from "cors";
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import logger from "./utils/logger.js";
import router from "./routes/identity-service.js";
import errorHandler from "./middlewares/errorHandler.js";
configDotenv();

const PORT = process.env.PORT || 3001;
const app = express();

//connect to mongodb
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info("Database connected"))
  .catch((error) => logger.error("Database connection failed", error.message));

const redisClient = new Redis(process.env.REDIS_URl);

//middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

//logging middleware
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request for ${req.url}`);
  logger.info(`Request body,  ${JSON.stringify(req.body)}`);
  next();
});

//DDos protection and rate limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 5,
  duration: 1,
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch((error) => {
      logger.warn(`Too many requests from this IP: ${req.ip}`);
      res.status(429).send("Too many requests from this IP");
    });
});

//rate limiting for sensitive endpoint
const endpointsRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).send("Sensitive endpoint rate limit exceeded");
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use("/api/auth/register", endpointsRateLimiter);

//routes
app.use("/api/auth", router);

//error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Identity service running on port${PORT}`);
});

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at ", promise, "reason:", reason);
});
