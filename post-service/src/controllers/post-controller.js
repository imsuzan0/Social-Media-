import logger from "../utils/logger.js";
import Post from "../models/Post.js";

export const createPost = async (req, res) => {
  logger.info("Create post endpoint hit");
  try {
    const { title, mediaIds } = req.body;
    const newPost = await Post.create({
      user: req.body.userId,
      title,
      mediaIds: mediaIds || [],
    });

    await newPost.save();
    logger.info("Post created successfully", newPost._id);
    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: newPost,
    });
  } catch (error) {
    logger.error("Error creating post", error);
    res.statux(500).send({ success: false, message: "Error creating post" });
  }
};

export const getAllPosts = async (req, res) => {
  logger.info("Get all posts endpoint hit");
  try {
  } catch (error) {
    logger.error("Error fetching all posts", error);
    res
      .statux(500)
      .send({ success: false, message: "Error fetching all posts" });
  }
};

export const getPost = async (req, res) => {
  logger.info("Get post endpoint hit");
  try {
  } catch (error) {
    logger.error("Error fetching post by ID", error);
    res
      .statux(500)
      .send({ success: false, message: "Error fetching post by ID" });
  }
};

export const deletePost = async (req, res) => {
  logger.info("Delete post endpoint hit");
  try {
  } catch (error) {
    logger.error("Error deleting post", error);
    res.statux(500).send({ success: false, message: "Error deleting post" });
  }
};
