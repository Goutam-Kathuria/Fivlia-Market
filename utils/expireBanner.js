const Banner = require("../modals/banner");

async function expireBanner() {
  const now = new Date();

  const activated = await Banner.updateMany(
    {
      aprroveStatus: "active",
      status: false,
      fromDate: { $lte: now, $ne: null },
      toDate: { $gt: now, $ne: null },
    },
    {
      $set: {
        status: true,
      },
    }
  );

  const expired = await Banner.updateMany(
    {
      aprroveStatus: "active",
      toDate: { $lte: now, $ne: null },
    },
    {
      $set: {
        aprroveStatus: "expired",
        status: false,
      },
    }
  );

  return (activated.modifiedCount || 0) + (expired.modifiedCount || 0);
}

module.exports = expireBanner;
