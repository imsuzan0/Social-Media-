import express from "express";
import { register } from "../controllers/identity-controller.js";

const router = express.Router();

router.post("/register", register);

export default router;
