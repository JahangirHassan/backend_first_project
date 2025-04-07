import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    if (!name || !description){
        throw new ApiError(400, "Name and description are required")
    }
    const playlist = await Playlist.create({
        name,
        description,
        user: req.user?._id
    })
    if(!playlist){
        throw new ApiError(500, "Unable to create playlist")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, {playlist}, "Playlist created successfully")
    )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if (!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user ID")
    }
    const playList = await Playlist.aggregate([
        {
            $match: {user: new mongoose.Types.ObjectId(userId)}
        },
        {
          $lookup:{
            from : "videos",
            localField : "video",
            foreignField: "_id",
            as : "videos",
          }
        },
        {
            $addFields:{
                totalVideo:{$size: "$videos"},
                totalViews:{$sum: "$videos.views"},
            }
        },
        {
            $project:{
                _id: 1,
                name: 1,
                description: 1,
                totalVideo: 1,
                totalViews: 1,
                createdAt: 1,
                updatedAt: 1,
            }
        }
    ])

    if (!playList){
        throw new ApiError(404, "Playlists not found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, playList, "Playlists fetched successfully")
    )


})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist ID")
    }
    const getPlayList = await Playlist.aggregate([
        {
            $match: {_id: new mongoose.Types.ObjectId(playlistId)}

        },
        {
            $lookup:{
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videos",
            }
        },
        {
            $match:{isPublish: true}
        },{
         $lookup:{
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner"
         }
        },
        {
        $addFields:{
            totalVideo: {$size: "$videos"},
            totalViews: {$sum: "$videos.views"},
            owner: {$first: "$owner"}
        }
    },
    {
        $project:{
            _id:1,
            name: 1,
            description: 1,
            totalVideo: 1,
            totalViews: 1,
            createdAt: 1,
            updatedAt: 1,
            owner:{
            _id: 1,
            userName: 1,
            fullName: 1,
            "avatar.url": 1,
        },
           videos:{
            _id: 1,
            title: 1,
            "videoField.url": 1,
            "videoField.thumbnail": 1,
            views: 1,
            createdAt: 1,
            duration: 1,
            description: 1
           }

        }
    }
    ])
    if (!getPlayList){
        throw new ApiError(404, "Playlist not found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, getPlayList, "Playlist fetched successfully")
    ) 
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid playlist ID or video ID")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist){
        throw new ApiError(404, "Playlist not found")
    }
    const video = await Playlist.findById(videoId)
    if (!video){
        throw new ApiError(404, "Video not found")
    }
    const isVideoAlreadyInPlaylist = await Playlist.findOne({
        _id: playlistId,
        videos: videoId
    })
    if (isVideoAlreadyInPlaylist){
        throw new ApiError(400, "Video already in playlist")
    }

    if (playlistId.owner?.toString() && videoId.owner?.toString() !== req.user?.toString()){
        throw new ApiError(403, "You are not allowed to add video to this playlist")
    }
     const addVideoToPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet:{
                videos:videoId,
            }
        },
        {
            new: true
        }
     );

     if(!addVideoToPlaylist){
        throw new ApiError(404, "Failed to add video to playlist")
     }
        return res
        .status(200)
        .json(
            new ApiResponse(200, addVideoToPlaylist, "Video added to playlist successfully")
        )

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid playlist ID or video ID")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist){
        throw new ApiError(404, "Playlist not found")
    }
    const video = await Playlist.findById(videoId)
    if (!video){
        throw new ApiError(404, "Video not found")
    }
    if (playlistId.owner?.toString() && videoId.owner?.toString() !== req.user?.toString()){
        throw new ApiError(403, "You are not allowed to remove video from this playlist")
    }
    const removeVideoFromPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $pull:{
                videos: videoId
            }
        },
        { new: true }
    )
if(!removeVideoFromPlaylist){
    throw new ApiError(404, "Failed to remove video from playlist")
}

return res
    .status(200)
    .json(
        new ApiResponse(200, removeVideoFromPlaylist, "Video removed from playlist successfully")
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if (!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist ID")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist){
        throw new ApiError(404, "Playlist not found")
    }
    if (playlist.user?.toString() !== req.user?.toString()){
        throw new ApiError(403, "You are not allowed to delete this playlist")
    }
    const deletePlaylist = await Playlist.findByIdAndDelete(playlist?._id)
    if (!deletePlaylist){
        throw new ApiError(404, "Failed to delete playlist")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, deletePlaylist, "Playlist deleted successfully")
        )



})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if (!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist ID")
    }
    if (!name || !description){
        throw new ApiError(400, "Name and description are required")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist){
        throw new ApiError(404, "Playlist not found")
    }
    if (playlist.user?.toString() !== req.user?.toString()){
        throw new ApiError(403, "You are not allowed to update this playlist")
    }
const updatePlaylist = await Playlist.findByIdAndUpdate(
    playlist?._id,
    {
        $set:{
            name,
            description
        }
    },
    {
        new: true
    })
if (!updatePlaylist){
    throw new ApiError(404, "Failed to update playlist")
}
return res
    .status(200)
    .json(
        new ApiResponse(200, updatePlaylist, "Playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}