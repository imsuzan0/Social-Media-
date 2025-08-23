import logger from "../utils/logger.js";        // Custom logger utility
import Post from "../models/Post.js";           // Mongoose Post model
import { validateCreatePost } from "../utils/validation.js";  // Joi validation function

// ------------------------------
// Helper: Invalidate Redis cache
// ------------------------------
async function invalidatePostCache(req, input) {
  // Key for single post cache
  const cacheKey = `post:${input}`;
  await req.redisClient.del(cacheKey); // Delete single post cache if exists

  // Find all cached post lists (pagination keys like posts:1:10, posts:2:10)
  const keys = await req.redisClient.keys(`posts:*`);
  if (keys.length > 0) {
    await req.redisClient.del(keys); // Delete all post list caches
  }
}

// ------------------------------
// Create a new Post
// ------------------------------
export const createPost = async (req, res) => {
  logger.info("Create post endpoint hit");
  try {
    // Validate request body with Joi schema
    const { error } = validateCreatePost(req.body);

    if (error) {
      logger.warn("Validation error at create post", error.details[0].message);
      return res.status(400).send({
        success: false,
        message: error.details[0].message, // Return validation error
      });
    }

    // Extract data from request body
    const { title, mediaIds } = req.body;

    // Create a new Post document in MongoDB
    const newPost = await Post.create({
      user: req.user,          // User ID comes from middleware (x-user-id header)
      title,
      mediaIds: mediaIds || [], // Default to empty array if not provided
    });

    // Save post (redundant but ensures persistence)
    await newPost.save();

    // Invalidate Redis cache (both single post + all post lists)
    await invalidatePostCache(req, newPost._id);

    // Success response
    logger.info("Post created successfully", newPost._id);
    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: newPost,
    });
  } catch (error) {
    logger.error("Error creating post", error);
    res.status(500).send({ success: false, message: "Error creating post" });
  }
};

// ------------------------------
// Get all posts (with pagination + cache)
// ------------------------------
export const getAllPosts = async (req, res) => {
  logger.info("Get all posts endpoint hit");
  try {
    // Extract pagination info from query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // Cache key for this specific page + limit
    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      // If cache exists → return cached posts
      return res.status(200).json(JSON.parse(cachedPosts));
    }

    // Otherwise → fetch from MongoDB
    const posts = await Post.find({})
      .sort({ createdAt: -1 }) // Sort by latest
      .skip(startIndex)        // Skip previous pages
      .limit(limit);           // Limit to current page size

    // Count total posts (for pagination info)
    const totalNoOfPosts = await Post.countDocuments();

    // Structure response
    const results = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };

    // Cache the result for 5 minutes
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(results));

    // Send response
    res.status(200).json(results);
  } catch (error) {
    logger.error("Error fetching all posts", error);
    res.status(500).send({ success: false, message: "Error fetching all posts" });
  }
};

// ------------------------------
// Get single post by ID
// ------------------------------
export const getPost = async (req, res) => {
  logger.info("Get post endpoint hit");
  try {
    const postId = req.params.id;              // Extract postId from route
    const cacheKey = `post:${postId}`;

    // Check Redis cache first
    const cachedPost = await req.redisClient.get(cacheKey);
    if (cachedPost) {
      return res.status(200).json(JSON.parse(cachedPost));
    }

    // If not in cache → fetch from DB
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send({ success: false, message: "Post not found" });
    }

    // Save result in cache for 1 hour
    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(post));

    // Return the post
    res.status(200).json(post);
  } catch (error) {
    logger.error("Error fetching post by ID", error);
    res.status(500).send({ success: false, message: "Error fetching post by ID" });
  }
};

// ------------------------------
// Delete a post (only if it belongs to current user)
// ------------------------------
export const deletePost = async (req, res) => {
  logger.info("Delete post endpoint hit");
  try {
    // Delete post where:
    //  - ID matches route param
    //  - User matches logged-in user
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user,
    });

    if (!post) {
      // Post not found or user not owner
      return res.status(404).send({ success: false, message: "Post not found" });
    }

    // Invalidate Redis caches
    await invalidatePostCache(req, req.params.id);

    // Send success response
    res.status(200).send({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    logger.error("Error deleting post", error);
    res.status(500).send({ success: false, message: "Error deleting post" });
  }
};
