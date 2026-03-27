const mongoose = require("mongoose");

const userNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },

    title: String,
    description: String,
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "notification",
    },
    screen: String,
    refId: mongoose.Schema.Types.ObjectId,
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

userNotificationSchema.index({ userId: 1, createdAt: -1 });

userNotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 } // 30 days
);

module.exports = mongoose.model("user_notification", userNotificationSchema);
