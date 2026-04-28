const mongoose = require("mongoose");

const helpFormSchemma = new mongoose.Schema(
  {
    title:String,
    message:String,
    userId:{type: mongoose.Schema.Types.ObjectId, ref: "user"},
  },
  { timestamps: true }
);

module.exports = mongoose.model("helpForm", helpFormSchemma);