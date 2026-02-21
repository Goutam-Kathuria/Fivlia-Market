const mongoose = require("mongoose");

const settingSchemma = new mongoose.Schema(
  {
    term_and_conditons:String,
    radius:Number,
    name:String,
    email:String,
    password:String
  },
  { timestamps: true }
);

module.exports = mongoose.model("setting", settingSchemma);
