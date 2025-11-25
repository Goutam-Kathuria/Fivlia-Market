const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    image: String,
    title: { type: String, required: true },
    mainCategory: {
      name: { type: String },
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "Categories" },
    },
    subCategory: {
      name: { type: String },
      _id: { type: mongoose.Schema.Types.ObjectId },
    },

    latitude:{ type: Number, default:29.1492},
    longitude:{ type: Number, default:75.7217},
    range:{type:Number,default:50},
    status: { type: Boolean, dafault: true },
    type: { type: String, enum: ["offer", "normal"], default: "normal" },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Banner", bannerSchema);

//   zones: [{type: {type: String,enum: ['Point'],required: true},coordinates: {type: [Number],required: true},    address: {type: String,required: true}}],
