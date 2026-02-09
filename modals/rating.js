const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    value: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },
  },
  { timestamps: true },
);

ratingSchema.index({ productId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("rating", ratingSchema);
