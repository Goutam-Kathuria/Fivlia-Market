const User = require("../modals/user");
const jwt = require("jsonwebtoken");
const OtpModel = require("../modals/otp");
const Product = require("../modals/product");
const BannerPlan = require("../modals/banner_type");
const Banner = require("../modals/banner");
const Setting = require("../modals/setting");
const sendFcmPush = require("../utils/firebase/sendNotification");
const { recordBannerEarning } = require("../utils/bannerEarnings");
const UserNotification = require("../modals/userNotification");
const { sendMessages } = require("../utils/sendMessages");

const {
  normalizeFcmToken,
  isLikelyFcmToken,
} = require("../utils/firebase/fcmToken");

exports.register = async (req, res) => {
  try {
    const { name, password, mobileNumber, email, adharCardNumber } = req.body;

    const newUser = await User.create({
      name,
      password,
      mobileNumber,
      email,
      adharCardNumber,
    });

    return res
      .status(200)
      .json({ message: "User Created Successfully", newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { mobileNumber, fcmToken, password } = req.body;

    if (!mobileNumber || !password) {
      return res
        .status(400)
        .json({ message: "mobileNumber and password are required" });
    }

    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const otp =
      mobileNumber === "+919999999999"
        ? 123456
        : Math.floor(100000 + Math.random() * 900000);
    const message = `Dear Customer Your Fivlia Login OTP code is ${otp}. Valid for 5 minutes. Do not share with others Fivlia - Delivery in Minutes!`;

    const normalizedFcmToken = normalizeFcmToken(fcmToken);
    if (isLikelyFcmToken(normalizedFcmToken)) {
      user.fcmToken = normalizedFcmToken;
      await user.save();
    }

    try {
      const response = await sendMessages(
        mobileNumber,
        message,
        "1707176060665820902",
      );
      await OtpModel.create({
        mobileNumber,
        otp,
        expiresAt: Date.now() + 2 * 60 * 1000,
      });
      return res.status(200).json({
        status: 1,
        message: "OTP sent successfully",
        data: response,
      });
    } catch (err) {
      console.error("Failed to send OTP:", err);
      return res.status(500).json({
        status: 2,
        message: "Failed to send OTP",
        error: err.message,
      });
    }
  } catch (error) {
    console.error("Error in login:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;
    // Find OTP in DB

    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(401).json({ message: "Invalid mobile number" });
    }

    const otpRecord = await OtpModel.findOne({ mobileNumber, otp });
    console.log("otpRecord", otpRecord);
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await OtpModel.deleteOne({ _id: otpRecord._id });
    const token = jwt.sign(
      { id: user._id, mobileNumber: user.mobileNumber },
      process.env.JWT_SECRET,
    );

    return res.status(200).json({
      message: "Login Successfully",
      token,
      userId: user._id,
      userName: user.name,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred" });
  }
};

exports.updateFcmToken = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user;
    const normalizedFcmToken = normalizeFcmToken(req.body?.fcmToken);

    if (!isLikelyFcmToken(normalizedFcmToken)) {
      return res.status(400).json({ message: "Invalid FCM token" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { fcmToken: normalizedFcmToken } },
      { new: true },
    ).select("_id fcmToken updatedAt");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "FCM token updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update FCM token error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    return res.status(200).json({ message: "Users", users });
  } catch (error) {
    console.error("Error creating store:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    let userId = req.user;
    const user = await User.findById(userId);
    return res.status(200).json({ message: "Users", user });
  } catch (error) {
    console.error("Error creating store:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

exports.editProfile = async (req, res) => {
  try {
    const userId = req.user;
    const { name, password, mobileNumber, email } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (password !== undefined) updateData.password = password;
    if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber;
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (req.files?.image) {
      updateData.image = `/${req.files.image[0].key}`;
    }
    await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    return res.status(200).json({ message: "Profile Update" });
  } catch (error) {
    console.error("Error creating store:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { mobileNumber, newPassword } = req.body;

    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.planRenewal = async (req, res) => {
  try {
    const userId = req.user;
    const { id, type, transactionId } = req.body;

    if (!id || !type) {
      return res.status(400).json({ message: "id and type are required" });
    }

    if (!transactionId || String(transactionId).trim() === "") {
      return res.status(400).json({
        message: "Transaction ID is required for renewal",
      });
    }

    const normalizedTransactionId = String(transactionId).trim();

    /*
    PRODUCT RENEWAL
    */
    if (type === "product") {
      const product = await Product.findByIdAndUpdate(
        id,
        {
          productStatus: "active",
          transactionId: normalizedTransactionId,
        },
        { new: true },
      );

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const settings = await Setting.findOne().select("productPrice").lean();

      let amount = Number(settings?.productPrice ?? 0);
      if (!Number.isFinite(amount) || amount < 0) amount = 0;

      try {
        await Earning.create({
          sourceType: "product",
          amount,
          transactionId: normalizedTransactionId,
          userId,
          referenceModel: "product",
          referenceId: product._id,
          meta: {
            renewal: true,
          },
        });
      } catch (earningError) {
        if (earningError?.code !== 11000) {
          console.error("Failed to record product renewal:", earningError);
        }
      }
    }

    /*
    BANNER RENEWAL
    */
    if (type === "banner") {
      const banner = await Banner.findById(id);

      if (!banner) {
        return res.status(404).json({ message: "Banner not found" });
      }

      const selectedPlan = await BannerPlan.findById(banner.selectedPlanId)
        .select("_id price type")
        .lean();

      if (!selectedPlan) {
        return res.status(404).json({ message: "Banner plan not found" });
      }

      banner.status = true;
      banner.transactionId = normalizedTransactionId;
      banner.aprroveStatus = "active";
      await banner.save();

      try {
        await recordBannerEarning({
          transactionId: normalizedTransactionId,
          userId,
          bannerId: banner._id,
          selectedPlan,
        });
      } catch (err) {
        console.error("Failed to record banner renewal:", err);
      }
    }

    return res.status(200).json({
      message: "Plan renewed successfully",
    });
  } catch (error) {
    console.error("Error renewing plan:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.sendChatNotification = async (req, res) => {
  try {
    const { name, receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res
        .status(400)
        .json({ message: "ReceiverId and message are required" });
    }

    const receiver = await User.findById(receiverId).select("fcmToken").lean();
    if (!receiver || !receiver.fcmToken) {
      return res
        .status(404)
        .json({ message: "Receiver not found or has no FCM token" });
    }

    const pushPayload = {
      title: name,
      body: message,
      data: {},
    };

    const result = sendFcmPush(receiver.fcmToken, pushPayload);

    console.log("Chat notification sent:", result);
    res.json({ message: "Notification sent" });
  } catch (error) {
    console.error("Error sending chat notification:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { type, id } = req.body;
    const userId = req.user;

    if (type === "single") {
      await UserNotification.deleteOne({
        _id: id,
        userId,
      });
    }

    if (type === "all") {
      await UserNotification.deleteMany({
        userId,
      });
    }

    return res.status(200).json({
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

exports.getUserNotifications = async (req, res) => {
  const userId = req.user;

  const notifications = await UserNotification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  res.json({
    data: notifications,
    unreadCount,
  });
};
