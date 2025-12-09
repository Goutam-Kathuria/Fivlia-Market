const mongoose = require("mongoose");

const citySchemma = new mongoose.Schema(
  {
    city: {
      type: String,
    },
    latitude: Number,
    longitude: Number,
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("locations", citySchemma);
