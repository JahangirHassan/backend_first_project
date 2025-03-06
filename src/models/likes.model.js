import mongoose, { Schema, } from "mongoose";



const likesSchema = new Schema(
          {
                    video: {
                              type: [Schema.Types.ObjectId],
                              ref: "Video"
                    },
                    comment: {
                              type: [Schema.Types.ObjectId],
                              ref: "Commment"
                    },
                    tweet: {
                              type: [Schema.Types.ObjectId],
                              ref: "Tweet"
                    },
                    likeBy:{
                              type:[Schema.Types.ObjectId],
                              ref: "User"
                    }
          },
          {
                    Timestamps: true
          }
)


export const Like = mongoose.model("Like", likesSchema);