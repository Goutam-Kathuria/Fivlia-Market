const mongoose = require("mongoose");
const {
  HOME_BANNER_PLAN_TYPE,
  CATEGORY_BANNER_PLAN_TYPE,
} = require("../utils/bannerHelpers");

const bannerPlanSchemma = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [HOME_BANNER_PLAN_TYPE, CATEGORY_BANNER_PLAN_TYPE],
      required: true,
    },
    price: { type: Number, required: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("banner_type", bannerPlanSchemma);
