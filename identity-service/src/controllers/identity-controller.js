import logger from "../utils/logger.js";
import validateRegistration from "../utils/validation.js";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

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
    return res
      .status(200)
      .send({
        success: true,
        message: "User registered successfully",
        accessToken,
        refreshToken,
      });
  } catch (error) {
    logger.error("Error registering user", error);
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
};

export const login = (req, res) => res.send("login");
export const logout = (req, res) => res.send("logout");
export const refresh = (req, res) => res.send("refresh");
