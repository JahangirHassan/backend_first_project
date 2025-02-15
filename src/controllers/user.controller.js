import { asyncHandler } from "../utils/asyncHandler.js";
import  { User }  from "../models/user.model.js" ;
import { ApiError }  from "../utils/ApiError.js"
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser= asyncHandler(async(res , req)=>{

// get  user data 
// validation- not empty 
//check if user already exist: email, username
// check for avatar, check for image
//upload them to cloudnary 
// create user object create entery in db
//remove password and refreshtoken fields response 
//check for user creation 
// return response

const {email, userName, fullName, password, } = req.body ;
console.log(req.body)

if ([email, userName, fullName, password].some((field)=> field?.trim()==="")){
    throw new ApiError(400, "all fields are mendantory");
    
    
}
  const userExisted= User.findOne({
    $or:[
        { email },
        { userName }
    ]
 })
 if(userExisted){
    throw new ApiError(409, "user already exist");
 }

 const avatarLocalPath = req.files?.avatar[0]?.path ;
 console.log("avatar local path",avatarLocalPath);
 
 const coverImageLocalPath = req.files?.coverImage[0]?.path ;
 console.log("cover image local path:",coverImageLocalPath);

 if (!avatarPath){
    throw new ApiError(400, "avatar file is required")
 }
 
 const avatar = await uploadOnCloudinary(avatarLocalPath)
 
 const coverImage = await uploadOnCloudinary(coverImageLocalPath)
 
 if (!avatar){
    throw new ApiError(500, "error uploading images to cloudinary")
 }

 const userCreation = await User.create(
   {
      email,
      fullName,
      userName: userName.toLowerCase() ,
      avatar : avatar.url,
      coverImage : coverImage?.url || "",
      password,
   }
 )
console.log("userCreation: ",userCreation)

const createdUser = await User.findById(userCreation._id).select(
   " -password -refreshToken"
)
  console.log("created user is : ", createdUser)

  if (!createdUser){
   throw new ApiError(500,"something went wrong in creation of user")
  }

  return res.status(201).json(
    new ApiResponse(
     200, createdUser, "user registered successfully"
    )
  )
})


export { registerUser };

