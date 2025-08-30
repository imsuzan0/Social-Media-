import Media from "../models/Media.js";
import { deleteMediaFromCloudinary } from "../utils/cloudinary.js";
import logger from "../utils/logger.js";

export const handlePostDeleted = async (event) => {
  console.log(event, "event-event");
  const { postId, mediaIds } = event;
  try {
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });
    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);
      logger.info(
        `Deleted media ${media._id} from Cloudinary and database for post ${postId}`
      );
    }
    logger.info(`Completed media deletion for post ${postId}`);

  } catch (error) {
    logger.error(
      `Error occured while media deletion for post ${postId}: ${error.message}`
    );
  }
};
