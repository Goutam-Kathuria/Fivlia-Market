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
    aprroveStatus:{type:String,default:'pending',enum:['pending','rejected','active', "expired"]},
    status: { type: Boolean, dafault: false },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Banner", bannerSchema);

//   zones: [{type: {type: String,enum: ['Point'],required: true},coordinates: {type: [Number],required: true},    address: {type: String,required: true}}],
