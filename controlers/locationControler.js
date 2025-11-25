const User = require("../modals/user");

exports.saveLocation = async (req, res) => {
  try {
    const userId = req.user;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude and Longitude are required" });
    }

    const location = await User.findByIdAndUpdate(userId, {
      latitude: lat,
      longitude: lng,
    });
    
    return res
      .status(200)
      .json({ message: "Location saved successfully", location });
  } catch (error) {
    console.error("❌ Error fetching banners:", error);
    return res.status(500).json({
      message: "An error occurred while fetching banners.",
      error: error.message,
      count: 0,
      data: [],
    });
  }
};
