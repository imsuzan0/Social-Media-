import express from "express";
import { login, logout, refreshToken, register } from "../controllers/identity-controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);

export default router;
