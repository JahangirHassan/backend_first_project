import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

 const verifyJWT = asyncHandler(async (req, res, next) => {

try {
          const token = req.cookies?.accessToken || req.header("Authorization")?.replace("barreer ", "");
          if (!token) {
           throw new ApiError("Unauthorized request");
          }
          
          const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            
          const user = await  User.findById(decodeToken._id)?.select(
                    "-password -__v -createdAt -updatedAt -refreshToken"
          )
          if (!user) {
                    //TODE Discussion about frontend
                    throw new ApiError(401,"invalid access token");
          }
          req.user = user;
          next();
} catch (error) {

          throw new ApiError(401,"invalid access token in middleware");
          
          
}

})

export {verifyJWT};