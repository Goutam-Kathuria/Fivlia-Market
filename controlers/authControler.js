const User = require("../modals/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
    const { mobileNumber, email, password } = req.body;

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

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, mobileNumber: user.mobileNumber },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({ message: "Login Successfully", token, userId: user._id });
  } catch (error) {
    console.error("Error creating store:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
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
