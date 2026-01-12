// cron/expireProducts.js
const products = require("../modals/product");

async function expireProducts() {
  const now = new Date();

  await products.updateMany(
    {
      productStatus: "active",
      expiresAt: { $lte: now },
    },
    {
      $set: { productStatus: "expired" },
    }
  );

  console.log("✅ Expired products updated");
}

module.exports = expireProducts;
