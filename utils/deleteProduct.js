// cron/deleteOldProducts.js
const products = require("../modals/product");

async function deleteOldProducts() {
  const now = new Date();

  // 1 month ago (30 days)
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  // Delete products that:
  // 1. Are expired (productStatus = "expired")
  // 2. Have been expired for at least 1 month (expiresAt <= 1 month ago)
  const deleted = await products.deleteMany({
    productStatus: "expired",
    expiresAt: { $lte: oneMonthAgo },
  });

  console.log(`🗑 Deleted ${deleted.deletedCount} expired products (after 1 month grace period)`);
}

module.exports = deleteOldProducts;
