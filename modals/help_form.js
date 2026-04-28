const mongoose = require("mongoose");

const helpFormSchemma = new mongoose.Schema(
  {
    title: String,
    message: String,
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("helpForm", helpFormSchemma);