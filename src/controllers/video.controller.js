import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteOnCloudinary} from "../utils/Cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    console.log("this is req dot query", req.query)

    const pipeline = [];
    if (query){
        pipeline.push({
            $search:{
                index: "search-videos",
                text: {
                    query: query,
                    path:[ "title", "description"]
                }

            }
        })
    }
    if(userId){

         if(!isValidObjectId(userId)){
            throw new ApiError(400, "invalid user id")
         }
         pipeline.push({
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
         })
    }

    pipeline.push({
        $match:{
            isPublish: true
        }
    })

    if (sortBy && sortType){
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc"? 1 : -1
            }
        })
    }
    else {
        pipeline.push({
            $sort: {
                createdAt: -1
            }
        })}

        pipeline.push({
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline:[
                    {
                        $project:{
                            fullName: 1,
                            userName: 1,
                            avatar: 1
                        }
                    }
                ]
            }},
            {
                $unwind: "$ownerDetails"
        })

        option = {
            page: parseInt(page),
            limit: parseInt(limit)
        }
        
        const videoAggregate = await Video.aggregate(pipeline)
         
        const videos = await Video.aggregatePaginate(videoAggregate, option)
     
        return res
        .status(200)
        .json(
            new ApiResponse(200, videos, "videos fetched successfully")
        )
        
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
      
    if (!(title || description)){
       throw new ApiError(400,"title and description are missing")
    }

    let videoFileLocalPath

    if(req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0){

        videoFileLocalPath = req.files.videoFile[0]?.path

    }
    let thumbnailLocalPath 

   if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length> 0){
    thumbnailLocalPath = req.files.thumbnail[0]?.path
   }

    if(!videoFileLocalPath){
        throw new ApiError(400," video File is missing ")
    }

    if(!thumbnailLocalPath){
        throw new ApiError(400," thumbnail is missing ")
    }
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    
    if(!videoFile){
        throw new ApiError(500," error uploading video to cloudinary ")
    }
    if(!thumbnail){
        throw new ApiError(500," error uploading thumbnail to cloudinary ")
    }
    const videoCreation = await Video.create({
        title,
        description,
        videoFile:videoFile?.url,
        thumbnail:  thumbnail?.url,
        duration: videoFile.duration,
        isPublish: false,
        owner: req.user?._id

    })
    
    console.log("this is video controller video creator object", videoCreation)

    if(!videoCreation){
        throw new ApiError(500, "something wrong creating video object ")
        
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, videoCreation, "video object created successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if (!isValidObjectId(videoId)){
        throw new ApiError(400, "invalid video id")
    }
    if (!isValidObjectId(req.user?._id)){
        throw new ApiError(400, "invalid user id")
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likesTo"
        }},
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        },
                            $addFields: {
                                subscriberCount: {
                                    $size: "$subscribers"
                                },
                                isSubscribed: {
                                    $cond: {
                                        if: {
                                            $in: [mongoose.Types.ObjectId(req.user?._id), "$subscribers.subscriber"]
                                        },
                                        then: true,
                                        else: false
                                    },
                                },
                        },
                     },
                     {
                        $project:{
                            fullName: 1,
                            userName: 1,
                            avatar: 1,
                            subscriberCount: 1,
                            isSubscribed: 1
                        }
                     }
            ],

            },
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "commentsTo"
            }
        },
        {
            $addFields: {
                totalLikes: {
                    $size: "$likesTo"
                },
                totalComments: {
                    $size: "$commentsTo"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [ new mongoose.Types.ObjectId(req.user?._id), "likesTo.owner"]
                        },
                        then: true,
                        else: false
                    }
                },
                isCommented:{
                    $cond: {
                        if: {
                            $in: [ new mongoose.Types.ObjectId(req.user?._id), "$commentsTo.owner"]
                        },
                        then: true,
                        else: false
                    }
                }
            },

        },{
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                thumbnail:1,
                views: 1,
                duration: 1,
                isPublish: 1,
                owner: 1,
                createdAt: 1,
                totalLikes: 1,
                totalComments: 1,
                isLiked: 1,
                isCommented:1
                

            }
        }
    ])

    if(!video){
        throw new ApiError(404, "video not found")
    }
     await Video.findById(videoId, {
        $inc: {
            views: 1
        }
     })

     await User.findByIdAndUpdate(req.user?._id, {
        $addToSet:{
            watchHistory: videoId
        }
     })

    return res
    .status(200)
    .json(
        new ApiResponse(200, video[0], "video fatched successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description} = req.body
    if (!(title || description)){
        throw new ApiError(400,"title and description are missing")
    }
     if(!isValidObjectId(videoId)){
        throw new ApiError(400, "invalid video id")
     }
     
     const video = await Video.findById(videoId)
     if (!video){
        throw new ApiError(404, "video not found")
     }

     if (video?.owner?.toString() !== req.user?._id.toString){
        throw new ApiError(403, "you are not authorized to update this video")
     }
     console.log("this is  video owner", video?.owner)
     
     
     let thumbnailLocalPath
     if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length >0){
            thumbnailLocalPath = req.files.thumbnail[0]?.path
     }
      
     if (!thumbnailLocalPath){
            throw new ApiError(400, "thumbnail is missing")
     }

     const thumbnailLocalPathDelete = video.thumbnail
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!thumbnail){
        throw new ApiError(500, "error uploading thumbnail to cloudinary")
    }

    const updateVideo = await Video.findByIdAndUpdate(videoId,{
        $set:{
            title,
            description,
            thumbnail: thumbnail?.url
        }
    }, { new: true })
    
    if (!updateVideo){
        throw new ApiError(500, "error updating video")
    }
    if (updateVideo){
        await deleteOnCloudinary(thumbnailLocalPathDelete)
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updateVideo, "video updated successfully")
    )

    

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
     if(!isValidObjectId(videoId)){
        throw new ApiError(400, "invalid video id")
     }
      const video = await Video.findById(videoId)
      if(!video){
        throw new ApiError(404, "video not found")
      }
     
      if(video?.owner?.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "you are not authorized to delete this video")
      }
     const deleteVideo = await Video.findByIdAndDelete(video?._id)
      if(!deleteVideo){
        throw new ApiError(500, "error deleting video")
      }

      await deleteOnCloudinary(video.videoFile)
      await deleteOnCloudinary(video.thumbnail)
      await Like.deleteMany({video: videoId})
      await Comment.deleteMany({video: videoId})
      return res
      .status(200)
      .json(
        new ApiResponse(200, deleteVideo ||{}, "video deleted successfully")
      )

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)){
        throw new ApiError(400, "invalid video id")
    }
    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "video not found")
    }
    if(video?.owner?.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "you are not authorized to update this video")
    }

    const updateVideo = await Video.findByIdAndUpdate(videoId, {
        $set:{
            isPublish: !video.isPublish
        }
    })

    if(!updateVideo){
        throw new ApiError(500, "error updating video")
    }

    console.log("this is video publish status", updateVideo)

    return res
    .status(200)
    .json(
        new ApiResponse(200,{isPublish: updateVideo.isPublish}, "video publish status updated successfully")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}