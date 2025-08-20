import express from "express";
import { createPost } from "../controllers/post-controller.js";
import { authenticateRequest } from "../middlewares/auth-middleware.js";

const router = express.Router();

router.post("/create-post", authenticateRequest, createPost);

export default router;