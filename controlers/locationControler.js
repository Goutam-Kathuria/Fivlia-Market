const User = require("../modals/user");
const City = require("../modals/city");
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

exports.getCity = async (req, res) => {
  try {
    const city = await City.find();
    res.json(city);
  } catch (error) {
    console.error(err);
    return res.status(500).json({ message: "Error updating banner." });
  }
};

exports.addCity = async (req, res) => {
  try {
    const { city, latitude, longitude, status } = req.body;
    const newCity = await City.create({ city, latitude, longitude, status });
    return res.status(200).json({ message: "New city added", newCity });
  } catch (error) {
    console.error(err);
    return res.status(500).json({ message: "Error updating banner." });
  }
};

exports.editCity = async (req, res) => {
  try {
    const {cityId} = req.params;
    const { city, latitude, longitude, status } = req.body;
    const updateData = {};
    if (city) updateData.city = city;
    if (latitude) updateData.latitude = latitude;
    if (longitude) updateData.longitude = longitude;
    if (status) updateData.status = status;

    await City.findByIdAndUpdate(cityId, updateData);
    return res.status(200).json({ message: "City updated successfully" });
  } catch (error) {
    console.error(err);
    return res.status(500).json({ message: "Error updating banner." });
  }
};
