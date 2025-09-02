import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import logger from "./utils/logger.js";
import helmet from "helmet";
import cors from "cors";
import {RateLimiter} from "express-rate-limit";

dotenv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info("Connected to database");
  })
  .catch((error) => {
    logger.error("Error connecting to database", error);
    process.exit(1);
  });

const app = express();

const PORT = process.env.PORT || 3004;

app.use(helmet())
app.use(cors());
app.use(express.json());
app.use((req,res,next)=>{
    logger.info(`Received ${req.method} request for ${req.url}`);
    logger.info(`Request body,  ${JSON.stringify(req.body)}`);
    next();
})

const rateLimiter=RateLimiter({
    windowMs:1*60*1000,
    limit:100,
    standardHeaders:true,
    legacyHeaders:false,
    handler:(req,res)=>{
        logger.warn(`Too many requests from this IP: ${req.ip}`);
        res.status(429).send("Too many requests from this IP");
    },
    
})