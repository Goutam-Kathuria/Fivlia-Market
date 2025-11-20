const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  image: [String],
  description: String,
  category: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" },],
  subCategory: [{ type: mongoose.Schema.Types.ObjectId },],
  subSubCategory: [{ type: mongoose.Schema.Types.ObjectId }],
  status: { type: Boolean, default: true },
  price:Number,
  address:String,
  userId:{type: mongoose.Schema.Types.ObjectId, ref: "User"}
},{timestamps:true});
module.exports = mongoose.model("product", productSchema);
