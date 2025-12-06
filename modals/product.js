const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  image: [String],
  description: String,
  category: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" },],
  subCategory: [{ type: mongoose.Schema.Types.ObjectId },],
  status: { type: Boolean, default: true },
  price:Number,
  address:String,
  userId:{type: mongoose.Schema.Types.ObjectId, ref: "User"},
  productStatus:{type:String,default:'pending',enum:['pending','rejected','active', "sold", "expired"]},
  expiresAt: { type: Date },
  expiryDays: { type: Number, default: 30 },
},{timestamps:true});

productSchema.pre("save", function (next) {
  // Only assign expiry when product becomes ACTIVE
  if (this.isModified("productStatus") && this.productStatus === "active") {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + this.expiryDays);
    this.expiresAt = expiry;
  }
  next();
});

productSchema.methods.resetExpiry = function () {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + this.expiryDays);
  this.expiresAt = expiry;
};

module.exports = mongoose.model("product", productSchema);
