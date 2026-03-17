const mongoose = require("mongoose");

const bannerPlanSchemma = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["home", "subCategory"],
      required: true,
    },
    price: { type: Number, required: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("banner_type", bannerPlanSchemma);
