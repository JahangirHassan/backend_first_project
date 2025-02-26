import mongoose, { Schema, Types } from "mongoose";



const likesSchema = new Schema(
          {
                    video: {
                              type: [Schema.Types.ObjectId],
                              ref: "Video"
                    },
                    coment: {
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

likesSchema.plugin(likesSchema);

export const Like = mongoose.model("Like", likesSchema);