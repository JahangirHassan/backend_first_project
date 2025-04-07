import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {Video} from "../models/video.model.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)
    if (!video){
        throw new ApiError(404, "Video not found")
    }
    const commentAggregate = Comment.aggregate([{
        $match: {video: new mongoose.Types.ObjectId(videoId)}
    },
    {
         $lookup:{
            from : "users",
            localField : "user",
            foreignField : "_id",
            as : "userComments"
         }
    },{
    $lookup:{
        from:"likes",
        localField: "_id",
        foreignField: "comment",
        as: "commentlikes"
    }
    },
    {
        $addFields:{
            likesCount: {
                $size: "$commentlikes"
            },
            owner:{
            $first: "owner"
            },
            likeBy :{
                $cond:{
                    if:{$in: [req.user?._id, "$likes.likeBy"]},
                    then: true,
                    else: false
                }
            }
        }
    },{
    $sort:{createdAt: -1}
    },{
        $project:{
            content: 1,
            likesCount: 1,
            likeBy: 1,
            createdAt:1,
            owner: {
                fullName: 1,
                userName: 1,
                avatar: 1

            }
        }
    }
])

options = {
    page: parseInt(10),
    limit: parseInt(10)
}
const comments = await Comment.aggregatePaginate(commentAggregate, options);

return res
.status(200)
.json(
    new ApiResponse(200, comments, "Comments fetched successfully")
)

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    const {content} = req.body
    if(!content){
        throw new ApiError(400, "Comment content is required")
    }
    if (!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video ID")
    }
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "video Not Found")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if(!comment){
        throw new ApiError(500, "Comment not created")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, comment, "Comment created successfully")
    )
}) 

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const{content} = req.body
    const {commentId} = req.params
    if (!content){
        throw new ApiError(400, "Comment content is required")
    }
    if (!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment ID")
    }
    const comment = await Comment.findById(commentId);

    if (!comment){
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== req.user._id){
        throw new ApiError(403, "You are not authorized to update this comment")
    }

    const updateComment = await Comment.findByIdAndUpdate(comment?._id, {
        $set:{
            content
        }
    },
    {
        new: true
    }
    )
    if (!updateComment){
        throw new ApiError(500, "Comment not updated")
    }
   return res
   .status(200)
   .json(
         new ApiResponse(200, updateComment, "Comment updated successfully")
   )

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params
    if (!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment ID")
    }
    const comment = await Comment.findById(commentId)
    if (!comment){
        throw new ApiError(404, "Comment not found")
    }
    if (comment.owner.toString() !== req.user._id){
        throw new ApiError(403, "You are not authorized to delete this comment")
    }
    const deletedComment = await Comment.findByIdAndDelete(commentId)
    if (!deletedComment){
        throw new ApiError(500, "Comment not deleted")
    }
    await Like.deletemany({
        comment: commentId,
        likeBy: req.user._id
    })
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, deletedComment, "Comment deleted successfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }