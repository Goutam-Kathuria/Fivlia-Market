const Product = require("../modals/product");
const Banner = require("../modals/banner");
const UserNotification = require("../modals/userNotification");
const Setting = require("../modals/setting");
const sendFcmPush = require("./firebase/sendNotification");

async function expirePlanReminder() {
  try {
    // Get expiry reminder threshold from settings (default: 1 day)
    const settings = await Setting.findOne()
      .select("expiryReminderDays")
      .lean();

    const reminderDays = settings?.expiryReminderDays ?? 1;
    if (!reminderDays || reminderDays < 0) {
      console.log("Expiry reminder is disabled");
      return 0;
    }

    const now = new Date();
    // Calculate the date N days from now (where N = reminderDays)
    const reminderThresholdDate = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000);

    let reminderCount = 0;

    // ========== CHECK PRODUCTS ==========
    // Find products that:
    // 1. Are active (productStatus = "active")
    // 2. Will expire within the next N days (now < expiresAt <= reminderThresholdDate)
    const expiringProducts = await Product.find({
      productStatus: "active",
      expiresAt: { $gt: now, $lte: reminderThresholdDate },
    })
      .select("_id userId name expiresAt")
      .populate("userId", "_id fcmToken")
      .lean();

    for (const product of expiringProducts) {
      const user = product.userId;
      if (!user || !user.fcmToken) continue;

      const daysLeft = Math.ceil(
        (product.expiresAt - now) / (24 * 60 * 60 * 1000)
      );

      const pushPayload = {
        title: "Product Expiring Soon",
        body: `Your product "${product.name}" will expire in ${daysLeft} day(s). Renew now to keep it active!`,
        data: {
          type: "product_expiry",
          productId: String(product._id),
          expiryDate: product.expiresAt.toISOString(),
        },
      };

      try {
        // Send FCM push
        await sendFcmPush(user.fcmToken, pushPayload);

        // Create UserNotification record
        await UserNotification.create({
          userId: user._id,
          title: "Product Expiring Soon",
          description: `Your product "${product.name}" will expire in ${daysLeft} day(s). Renew now to keep it active!`,
          screen: "product_detail",
          refId: String(product._id),
        });

        reminderCount++;
      } catch (error) {
        console.error(`Failed to send product reminder for ${product._id}:`, error.message);
      }
    }

    // ========== CHECK BANNERS ==========
    // Find banners that:
    // 1. Are approved and active (aprroveStatus = "active", status = true)
    // 2. Will expire within the next N days (now < toDate <= reminderThresholdDate)
    const expiringBanners = await Banner.find({
      aprroveStatus: "active",
      status: true,
      toDate: { $gt: now, $lte: reminderThresholdDate },
    })
      .select("_id userId title toDate")
      .populate("userId", "_id fcmToken")
      .lean();

    for (const banner of expiringBanners) {
      const user = banner.userId;
      if (!user || !user.fcmToken) continue;

      const daysLeft = Math.ceil(
        (banner.toDate - now) / (24 * 60 * 60 * 1000)
      );

      const pushPayload = {
        title: "Banner Expiring Soon",
        body: `Your banner "${banner.title}" will expire in ${daysLeft} day(s). Renew now to keep it active!`,
        data: {
          type: "banner_expiry",
          bannerId: String(banner._id),
          expiryDate: banner.toDate.toISOString(),
        },
      };

      try {
        // Send FCM push
        await sendFcmPush(user.fcmToken, pushPayload);

        // Create UserNotification record
        await UserNotification.create({
          userId: user._id,
          title: "Banner Expiring Soon",
          description: `Your banner "${banner.title}" will expire in ${daysLeft} day(s). Renew now to keep it active!`,
          screen: "banner_detail",
          refId: String(banner._id),
        });

        reminderCount++;
      } catch (error) {
        console.error(`Failed to send banner reminder for ${banner._id}:`, error.message);
      }
    }

    console.log(`✅ Sent ${reminderCount} plan expiry reminders`);
    return reminderCount;
  } catch (error) {
    console.error("❌ Error in expirePlanReminder:", error);
    return 0;
  }
}

module.exports = expirePlanReminder;
