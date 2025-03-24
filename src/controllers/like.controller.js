import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/likes.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const likeAlreadyExists = await Like.findOne({
    video: videoId,
    likeBy: req.user._id,
  });
  if (likeAlreadyExists) {
    await Like.findByIdAndDelete(likeAlreadyExists?._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { isLike: false }, "Like removed successfully")
      );
  }

  await Like.create({
    video: videoId,
    likeBy: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { isLike: true }, "Like added successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const commentLikeAlreadyExists = await Like.findOne({
    comment: commentId,
    likeBy: req.user?._id,
  });

  if (commentLikeAlreadyExists) {
    await Like.findByIdAndDelete(commentLikeAlreadyExists?._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { isLike: false }, "Like removed successfully")
      );
  }

  await Like.create({
    comment: commentId,
    likeBy: req.user?._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { isLike: true }, "Like added successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweetLikeAlreadyExists = await Like.findOne({
    tweet: tweetId,
    likeBy: req.user?._id,
  });

  if (tweetLikeAlreadyExists) {
    await Like.findByIdAndDelete(tweetLikeAlreadyExists?._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { isLike: false }, "Like removed successfully")
      );
  }
  await Like.create({
    tweet: tweetId,
    likeBy: req.user?._id,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, { isLike: true }, "Like added successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const likeVideoAggregate = await Like.aggregate([
    {
      $match: {
        likeBy: mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        locslField: "video",
        foreignField: "_id",
        as: "likedVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "ownerdetails",
            },
          },
          {
            $unwind: "$userdetails",
          },
        ],
      },
    },
    {
      $unwind: "$likedVideos",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedVideos: {
          _id: 1,
          title: 1,
          description: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
          views: 1,
          duration: 1,
          owner: 1,
          createdAt: 1,
          ownerdetails: {
            userName: 1,
            FullName: 1,
            "avatar.url": 1,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likeVideoAggregate,
        "Liked videos fetched successfully"
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
