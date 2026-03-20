const mongoose = require("mongoose");

const earningSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      required: true,
      enum: ["product", "banner"],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transactionId: {
      type: String,
      required: true,
      trim: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    referenceModel: {
      type: String,
      required: true,
      enum: ["product", "Banner"],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ["recorded", "refunded"],
      default: "recorded",
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

earningSchema.index({ sourceType: 1, transactionId: 1 }, { unique: true });
earningSchema.index({ createdAt: -1 });

module.exports = mongoose.model("earning", earningSchema);

