import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import Redis from "ioredis";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import proxy from "express-http-proxy";
import logger from "../../identity-service/src/utils/logger.js";
import errorHandler from "./middlewares/errorHandler.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

//rate limiting
const rateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 50,
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

app.use(rateLimiter);

//logging middleware
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request for ${req.url}`);
  logger.info(`Request body,  ${JSON.stringify(req.body)}`);
  next();
});

//proxy middlewares
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error:${err.message}`);
    next(err);
  },
};

//setting up proxy for our identity service
app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      //it is called before the request is sent and can be used to modify the request headers
      proxyReqOpts.headers["content-type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(`Response from identity service:${proxyRes.statusCode}`);
      return proxyResData;
    },
  })
);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API gateway is running on port ${PORT}`);
  logger.info(
    `Identity service is running on port ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(`Redis Url ${process.env.REDIS_URL}`);
});
