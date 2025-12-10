const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    image: String,
    title: { type: String },
    mainCategory: {
      name: { type: String },
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "Categories" },
    },
    subCategory: {
      name: { type: String },
      _id: { type: mongoose.Schema.Types.ObjectId },
    },
    cityId: {type: mongoose.Schema.Types.ObjectId, ref: "locations"},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    status: { type: Boolean, dafault: true },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Banner", bannerSchema);

//   zones: [{type: {type: String,enum: ['Point'],required: true},coordinates: {type: [Number],required: true},    address: {type: String,required: true}}],
