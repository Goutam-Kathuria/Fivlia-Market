const mongoose = require("mongoose");

const productPlanSchemma = new mongoose.Schema(
  {
    duration: {
      type: Number,
      required: true,
    },
    price: { type: Number, required: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("product_plan", productPlanSchemma);
