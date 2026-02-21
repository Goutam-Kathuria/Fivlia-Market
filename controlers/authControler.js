const User = require("../modals/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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
    const { mobileNumber, email, fcmToken, password } = req.body;

    if (!mobileNumber || !password) {
      return res.status(400).json({ message: "mobileNumber and password are required" });
    }

    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const normalizedFcmToken = normalizeFcmToken(fcmToken);
    if (isLikelyFcmToken(normalizedFcmToken)) {
      user.fcmToken = normalizedFcmToken;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, mobileNumber: user.mobileNumber },
      process.env.JWT_SECRET,
    );

    return res
      .status(200)
      .json({ message: "Login Successfully", token, userId: user._id });
  } catch (error) {
    console.error("Error creating store:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
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
