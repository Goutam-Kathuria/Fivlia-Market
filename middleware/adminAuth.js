const jwt = require("jsonwebtoken");
const setting = require("../modals/setting");

const verifyAdminToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Admin token is required" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT secret is not configured" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const adminSettings = await setting.findById(decoded.id).select("_id").lean();
    if (!adminSettings) {
      return res.status(401).json({ message: "Admin session is not valid" });
    }

    req.admin = { id: adminSettings._id };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid admin token" });
  }
};

module.exports = verifyAdminToken;
