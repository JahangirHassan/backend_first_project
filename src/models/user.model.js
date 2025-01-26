import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
   userName:{
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index : true,
    minlength: 5,
    maxlength: 20,
    trim: true

   },
   email:{
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
   },
   fullName:{
    type: String,
    required: true,
    trim: true,
    index: true,
   },
   avatar:{
    type: String,
    require: true,

   },
   coverImage:{
    type: String,// cloudinary url
    
   },
   watchHistory:{
    type: Schema.Types.ObjectId,
    ref: "Video",
   },
   password:{
    type: String,
    required: [true,"password is required"],
    minlength: 8,
   },
   refreshTokens:{
    type: String

   },

  

},
{
    timestamps: true
   }
)

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    this.password = bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password)    
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            username: this.userName,
            email: this.email,
            fullname: this.fullName
        },
        process.env.ACESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    {
        _id: this._id
    },
    process.env.RESFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY

    }
  )
}

export const User = mongoose.model("User", userSchema)