const mongoose = require("mongoose");

const settingSchemma = new mongoose.Schema(
  {
    term_and_conditons:String,
    safety_and_policy:String,
    radius:Number,
    name:String,
    email:String,
    password:String,
    image:String,
    razor_pay_key:String,
    expiryReminderDays:{ type: Number, default: 1 },
    freeProductExpiryDays:{ type: Number, default: 90 },
    inquiry_number:String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("setting", settingSchemma);
