// cron/index.js
const cron = require("node-cron");
const expireProducts = require("../utils/expireDeleteProduct");
const deleteOldProducts = require("../utils/deleteProduct");

// Every day at 12:05 AM
cron.schedule("5 0 * * *", async () => {
  console.log("🕒 Running product maintenance cron");
  await expireProducts();
  await deleteOldProducts();
});
