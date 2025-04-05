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
                as : "subscriber"
            }
        }
    ])
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}