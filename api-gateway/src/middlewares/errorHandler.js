import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  logger.warn(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong",
  });
};
export default errorHandler;
