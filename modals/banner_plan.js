const mongoose = require("mongoose");

const bannerPlanSchemma = new mongoose.Schema(
  {
    duration: String,
    price: Number,
    status: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("banner_plan", bannerPlanSchemma);
