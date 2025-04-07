import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/likes.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const {userId} = req.user?._id;
    const totalSubcribers =  await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId
            }
        },
        {
            $group:{
                _id: null,
                subscribersCount: {$count: 1}
            }
        }
    ]) 

    const totalVideos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $project:{
                totalLikes: {$size: "$likes"},
                totalViews: "$views",
                totalVideos: 1,
            }
         },
        {

            $group: {
                _id: null,
                totalVideosCount: { $sum: 1 },
                totalLikesCount: { $sum: "$totalLikes" },
                totalViewsCount: { $sum: "$totalViews" }
            }
        }
    ])
    if (!totalSubcribers || !totalVideos){
        throw new ApiError(500, "Unable to fetch channel stats")
    }

    const stats = {
        totalSubscribers: totalSubcribers[0]?.subscribersCount || 0,
        totalVideos: totalVideos[0]?.totalVideosCount || 0,
        totalLikes: totalVideos[0]?.totalLikesCount || 0,
        totalViews: totalVideos[0]?.totalViewsCount || 0,
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, stats, "Channel stats fetched successfully")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const {userId} = req.user?._id;

    const totalVideos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from : "likes",
                localField : "_id",
                foreignField: "video",
                as : "likes",
            }
        },
        {
            $addFields:{
                createdAt: {
                    $dateTopart:{
                        $date: "$createdAt",
                    }
                },
               likesCount: {$size: "$likes"},
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project:{
                _id: 1,
                "videoFile.url": 1,
                "thumbnail.url": 1,
                title: 1,
                description: 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    day: 1,
                    hour: 1,
                    minute: 1,
                },
                isPublished: 1,
                likesCount: 1,
            }
        }
    ])
})

export {
    getChannelStats, 
    getChannelVideos
    }