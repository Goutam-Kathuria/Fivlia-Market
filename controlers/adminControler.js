const setting = require("../modals/setting");
const User = require("../modals/user");
const City = require("../modals/city");
const Notification = require("../modals/notification");
const mongoose =  require("mongoose")
exports.adminSetting = async (req, res) => {
  try {
    const { term_and_conditons, radius } = req.body;

    const updateData = {};

    // only add if value exists
    if (term_and_conditons !== undefined) {
      updateData.term_and_conditons = term_and_conditons;
    }

    if (radius !== undefined) {
      updateData.radius = radius;
    }

    await setting.findOneAndUpdate(
      {}, // single settings document
      { $set: updateData }, // update only given fields
      { new: true, upsert: true },
    );

    return res.status(200).json({
      message: "✅ Setting updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "❌ Failed to update setting",
    });
  }
};

exports.getAdminSetting = async (req, res) => {
  try {
    // ✅ fetch single settings document
    const settings = await setting.findOne().lean();

    if (!settings) {
      return res.status(404).json({
        message: "Settings not found",
      });
    }

    return res.status(200).json({
      message: "✅ Setting fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Get admin settings error:", error);

    return res.status(500).json({
      message: "❌ Failed to fetch settings",
    });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const {
      title,
      type = "general",
      sendType = "user",
      description,
      data = {},
      city = [],
      screen,
    } = req.body;

    // Basic validation
    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
      });
    }

    const image = `/${req.files?.image?.[0]?.key}`;
    const notification = await Notification.create({
      title,
      type,
      sendType,
      description,
      data,
      image,
      city,
      screen,
    });

    return res.status(201).json({
      message: "Notification created successfully",
      data: notification,
    });
  } catch (error) {
    console.error("Create Notification Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// UPDATE
exports.editNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    // Allow only updatable fields
    const allowedFields = [
      "title",
      "type",
      "sendType",
      "description",
      "data",
      "image",
      "city",
      "screen"
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.files?.image?.length) {
      updateData.image = `/${req.files.image[0].key}`;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({
      message: "Notification updated successfully",
      data: notification,
    });
  } catch (error) {
    console.error("Edit Notification Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Notifications fetched successfully",
      data: notifications,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.sendNotification = async (req, res) => {
  try {
    const { notificationId, radius = 5 } = req.body;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    let users = [];

    // 🔥 CASE 1: send to ALL users
    if (!notification.city?.length || notification.city.includes("all")) {
      users = await User.find({
        fcmToken: { $exists: true, $ne: "" },
      });
    }

    // 🔥 CASE 2: city-based radius filter
    else {
      const cities = await City.find({
        _id: { $in: notification.city },
      });

      const allUsers = await User.find({
        fcmToken: { $exists: true, $ne: "" },
        "location.latitude": { $exists: true },
        "location.longitude": { $exists: true },
      });

      for (const city of cities) {
        for (const user of allUsers) {
          const distance = getDistanceKm(
            city.latitude,
            city.longitude,
            user.location.latitude,
            user.location.longitude,
          );

          if (distance <= radius) {
            users.push(user);
          }
        }
      }
    }

    // Remove duplicates
    const uniqueUsers = Array.from(
      new Map(users.map((u) => [u._id.toString(), u])).values(),
    );

    // 🔔 SEND PUSH
    for (const user of uniqueUsers) {
      await sendFcmPush(user.fcmToken, {
        title: notification.title,
        body: notification.description,
        data: notification.data || {},
        image: notification.image || undefined,
      });
    }

    return res.status(200).json({
      message: "Notification sent successfully",
      sentCount: uniqueUsers.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
