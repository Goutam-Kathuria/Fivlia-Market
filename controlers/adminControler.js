const setting = require("../modals/setting");

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
      {},                    // single settings document
      { $set: updateData },  // update only given fields
      { new: true, upsert: true }
    );

    return res.status(200).json({
      message: "✅ Setting updated successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "❌ Failed to update setting"
    });
  }
};

exports.getAdminSetting = async (req, res) => {
  try {
    // ✅ fetch single settings document
    const settings = await setting.findOne().lean();

    if (!settings) {
      return res.status(404).json({
        message: "Settings not found"
      });
    }

    return res.status(200).json({
      message: "✅ Setting fetched successfully",
      data: settings
    });

  } catch (error) {
    console.error("Get admin settings error:", error);

    return res.status(500).json({
      message: "❌ Failed to fetch settings"
    });
  }
};
