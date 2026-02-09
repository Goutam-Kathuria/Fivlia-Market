const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["general"],
      default: "general",
    },
    sendType: {
        type: String,
        enum: ["user"],
        default: "user",
    },
    description: { type: String, required: true },
    data: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
    image: String,
    city: {type: String},
    screen: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("notification", notificationSchema);
