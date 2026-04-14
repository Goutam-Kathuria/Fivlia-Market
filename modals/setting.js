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
    productPrice:Number,
    razor_pay_key:String,
    expiryReminderDays:{ type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("setting", settingSchemma);
