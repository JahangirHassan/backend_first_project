import mongoose, {Schema} from "mongoose";

const SubscriptionSchema = new Schema({
  Subscriber: {
          type: Schema.Types.ObjectId,
          ref: "User"
  },
  channel:{
          type: Schema.Types.ObjectId,
          ref: "User"
  }
},
{
          timestamps: true
})




export const Subscription = mongoose.model("Subscription", SubscriptionSchema);
