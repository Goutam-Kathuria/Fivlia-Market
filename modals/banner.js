const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    image: String,
    title: { type: String },
    mainCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    subCategory: { type: mongoose.Schema.Types.ObjectId },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: "locations" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
    aprroveStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "rejected", "active", "resubmit", "expired"],
    },
    approvalReason: { type: String, default: "" },
    approvedAt: { type: Date },
    selectedPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "banner_plan",
    },
    fromDate: Date,
    toDate: Date,
    status: { type: Boolean, default: false },
    transactionId: String,
  },
  { timestamps: true },
);
module.exports = mongoose.model("Banner", bannerSchema);

//   zones: [{type: {type: String,enum: ['Point'],required: true},coordinates: {type: [Number],required: true},    address: {type: String,required: true}}],
