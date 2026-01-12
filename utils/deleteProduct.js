// cron/deleteOldProducts.js
const products = require("../modals/product");

async function deleteOldProducts() {
  const now = new Date();

  // 90 days ago
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

  const deleted = await products.deleteMany({
    createdAt: { $lte: threeMonthsAgo },
  });

  console.log(`🗑 Deleted ${deleted.deletedCount} old products`);
}

module.exports = deleteOldProducts;
