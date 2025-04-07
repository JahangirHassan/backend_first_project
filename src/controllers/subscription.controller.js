import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if (!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel ID")
    }
    const subscriber = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })
    if (subscriber){
        await Subscription.findByIdAndDelete(subscriber?._id)
        return res
            .status(200)
            .json(
                new ApiResponse(200, {isSubscribed: false}, "Subscription removed successfully")
            )
    }

    await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })
    return res
        .status(200)
        .json(
            new ApiResponse(200, {isSubscribed: true}, "Subscription added successfully")
        )

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel ID")
    }
    const subcribers = await Subscription.aggregate([
        {
            $match: {channel: mongoose.Types.ObjectId(channelId)}
        },
        {
            $lookup:{
                from : "users",
                localField : "subscriber",
                foreignField: "_id",
                as : "subscriber",
                pipeline:[
                    {
                        $lookup:{
                            from: "Subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subcribeToSubscribers",
                        }
                    },
                    {
                        $addFields:{
                            subcribeToSubscribers:{
                                cond:{
                                    if:{ $in: [channelId, "subcribeToSubscribers.subcriber"]},
                                    then: true,
                                    else: false
                                }
                            },
                            subscriberCount:{
                                $size: "$subcribeToSubscribers"
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project:{
                _id:0,
                subcriber:{
                  _id:1,
                  userName: 1,
                fullName: 1,
                "avatar.url": 1,
                subcribeToSubscribers: 1,
                subscriberCount: 1,
                }
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(200, subcribers, "Subscriber list fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if (!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid subscriber ID")
    }
    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {subscriber: mongoose.Types.ObjectId(subscriberId)}
        },
       {
        $lookup:{
            from: "users",
            localField: "channel",
            foreignField: "_id",
            as: "channelsSubscribers",
            pipeline:[
                 {
                    $lookup:{
                        from: "video",
                        localField: "channel",
                        foreignField: "owner",
                        as: "videos"
                    }
                 },
                 {
                    $addFields:{
                        latestVideo:{
                            $last: "$videos"
                        }
                    }
                 }
            ]
        }
       },
       {
        $unwind: "$channelsSubscribers"
       },
       {
        $project:{
            _id:0,
            channelsSubscribers:{
                _id:1,
                userName: 1,
                fullName: 1,
                "avatar.url": 1,
                latestVideo:{
                    _id:1,
                    title: 1,
                    "videoField.url": 1,
                    "videoField.thumbnail": 1,
                    views:1,
                    createdAt:1,
                    duration:1,
                    description:1,
                    owner:1

                }
            }

        }
       }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}