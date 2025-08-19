import logger from "../utils/logger.js";
import { validateRegistration, validateLogin } from "../utils/validation.js";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import RefreshToken from "../models/RefreshToken.js";

export const register = async (req, res) => {
  logger.info("Registration endpoint hit");
  try {
    //validate the schema
    const { error } = validateRegistration(req.body);

    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).send({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, username, password, bio, profilePicture } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });

    if (user) {
      logger.warn("User already exists", { email, username });
      return res.status(400).send({
        success: false,
        message: "User with this email or username already exists",
      });
    }
    user = new User({ email, username, password, profilePicture, bio });
    await user.save();
    logger.info("User registered successfully", user._id);
    const { accessToken, refreshToken } = await generateToken(user);
    return res.status(200).send({
      success: true,
      message: "User registered successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Error registering user", error);
    return res
      .status(500)
      .send({ success: false, message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  logger.info("Login endpoint hit");
  try {
    const { error } = validateLogin(req.body);

    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).send({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("User not found", { email });
      return res.status(400).send({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      logger.warn("Invalid password", { email });
      return res.status(400).send({
        success: false,
        message: "Invalid password",
      });
    }

    const { accessToken, refreshToken } = await generateToken(user);
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      accessToken,
      refreshToken,
      userId: user._id,
      username: user.username,
    });
  } catch (error) {
    logger.error("Error logging in user", error);
    return res
      .status(500)
      .send({ success: false, message: "Internal server error" });
  }
};
export const refreshToken = async (req, res) => {
  logger.info("Refresh token endpoint hit");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token not found");
      return res.status(400).send({
        success: false,
        message: "Refresh token not found",
      });
    }
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");
      return res.status(401).send({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User not found");
      return res.status(401).send({
        success: false,
        message: "User not found",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      generateToken(user);

    //delete the old refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    return res.status(200).send({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Error refreshing token", error);
    return res
      .status(500)
      .send({ success: false, message: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  logger.info("Logout endpoint hit");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token not found");
      return res.status(400).send({
        success: false,
        message: "Refresh token not found",
      });
    }

    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("Refresh token deleted for logout");
    return res.status(200).send({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    logger.error("Error logging out user", error);
    return res
      .status(500)
      .send({ success: false, message: "Internal server error" });
  }
};
