const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
  category:{type: mongoose.Schema.Types.ObjectId, ref: "Categories"},
  city:{type: mongoose.Schema.Types.ObjectId, ref: "locations"},
  bannerId:{type: mongoose.Schema.Types.ObjectId, ref: "Banner"},
  amount:{type: Number},
  status:{type:String, enum:['active', 'notActive', 'expired']},
  transactionId:{type:String},
  expireDate:{type: Date},
  startDate:{type: Date},
  expireDays:{type: Number},
  },
  { timestamps: true }
);
module.exports = mongoose.model("Banner", planSchema);

//   zones: [{type: {type: String,enum: ['Point'],required: true},coordinates: {type: [Number],required: true},    address: {type: String,required: true}}],
