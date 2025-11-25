const Banner = require("../modals/banner");

exports.banner = async (req, res) => {
  try {
    let {
      title,
      type,
      mainCategory,
      subCategory,
      status,
    } = req.body;
    const rawImagePath = req.files?.image?.[0]?.key || "";
    const image = rawImagePath ? `/${rawImagePath}` : "";

    const validTypes = ["normal", "offer"];
    const bannerType = validTypes.includes(type) ? type : "normal";
    if (!bannerType) {
      return res
        .status(402)
        .json({ message: 'Invalid banner type. Must be "normal" or "offer".' });
    }

    let foundCategory = null;
    let foundSubCategory = null;

      if (!mainCategory)
        return res.status(400).json({ message: "Main category is required" });

      foundCategory = await Category.findOne({ _id: mainCategory });
      if (!foundCategory)
        return res.status(204).json({ message: `Category ${mainCategory} not found` });

      if (subCategory) 
        foundSubCategory = foundCategory.subcat.find((sub) => sub._id.toString() === subCategory);
        if (!foundSubCategory)
          return res.status(204).json({ message: `SubCategory ${subCategory} not found` });

    let slug = "";
    if (foundCategory) {
      slug = `/category/${foundCategory._id}`;
      if (foundSubCategory) slug += `/${foundSubCategory._id}`;
    }
    const newBanner = await Banner.create({
      image,
      title,
      type: bannerType,

      mainCategory: foundCategory
        ? {
            _id: foundCategory._id,
            name: foundCategory.name,
            slug: slugify(foundCategory.name, { lower: true }),
          }
        : null,

      subCategory: foundSubCategory
        ? {
            _id: foundSubCategory._id,
            name: foundSubCategory.name,
            slug: slugify(foundSubCategory.name, { lower: true }),
          }
        : null,

      status,
    });
    return res
      .status(200)
      .json({ message: "Banner Added Successfully", newBanner });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An Error Occured", error: error.message });
  }
};

exports.getBanner = async (req, res) => {
  try {
    const { type } = req.query;
    const userId = req.user;

    const user = await User.findById(userId).lean();
    if (!user || !user.location?.latitude || !user.location?.longitude) {
      // console.log("❌ User location missing or incomplete");
      return res.status(400).json({ message: "User location not found" });
    }

    const userLat = user.location.latitude;
    const userLng = user.location.longitude;

    // 🟢 Get active zone IDs
    const zoneDocs = await ZoneData.find({ status: true }, "zones").lean();
    const activeZoneIds = [];
    zoneDocs.forEach((doc) => {
      (doc.zones || []).forEach((zone) => {
        if (zone.status && zone._id) {
          activeZoneIds.push(zone._id.toString());
        }
      });
    });
    // console.log("📍 Active Zone IDs:", activeZoneIds);

    // 🔎 Apply base filters
    const filters = { status: true };
    if (type) {
      const validTypes = ["offer", "normal"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          message: 'Invalid banner type. Must be "offer" or "normal".',
        });
      }
      filters.type = type;
    }

    const allBanners = await Banner.find(filters)
      .lean()
      .sort({ createdAt: -1 });
    const matchedBanners = await getBannersWithinRadius(
      userLat,
      userLng,
      allBanners
    );
    // console.log(matchedBanners)
    // console.log("🎯 All banners fetched:", allBanners.length);

    if (!matchedBanners.length) {
      return res.status(200).json({
        message: "No banners found for your location.",
        count: 0,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Banners fetched successfully.",
      count: matchedBanners.length,
      data: matchedBanners,
    });
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

exports.updateBannerStatus = async (req, res) => {
  try {
    let { id } = req.params;
    let {
      status,
      title,
      city,
      zones,
      type2,
      address,
      latitude,
      longitude,
      mainCategory,
      subCategory,
      subSubCategory,
      range,
      brand: brandId,
      storeId,
    } = req.body;

    const rawImagePath = req.files?.image?.[0]?.key;
    const image = rawImagePath ? `/${rawImagePath}` : "";

    const updateData = { status, title, type2 };

    if (rawImagePath) updateData.image = image;

    // Handle city
    if (typeof city === "string") {
     try {
       city = JSON.parse(city);
     } catch (err) {
       console.log(err)
       return res.status(400).json({ message: "Invalid city format" });
     }
    }
    
    let cityIds = Array.isArray(city) ? city : [city];
    
    const cityDoc = await ZoneData.find({ _id: { $in: cityIds } });
    if (cityDoc) {
      updateData.city = cityDoc.map(c => ({_id: c._id,name: c.city}));
    }

    if (type2 === "NO") {
      updateData.mainCategory = null;
      updateData.subCategory = null;
      updateData.subSubCategory = null;
      updateData.brand = null;
      updateData.storeId = null;
    }

    if (brandId) {
      const foundBrand = await brand.findById(brandId).lean();
      if (!foundBrand)
        return res.status(204).json({ message: `Brand ${brandId} not found` });
      updateData.brand = {
        _id: foundBrand._id,
        name: foundBrand.brandName,
        slug: slugify(foundBrand.brandName, { lower: true }),
      };
    }

    if (storeId) {
      const foundStore = await Store.findById(storeId).lean();
      if (!foundStore)
        return res.status(204).json({ message: `Store ${storeId} not found` });
      updateData.storeId = foundStore._id;
    }

    if (mainCategory) {
      const foundCategory = await Category.findById(mainCategory).lean();
      if (!foundCategory) {
        return res
          .status(404)
          .json({ message: `Category ${mainCategory} not found` });
      }
      updateData.mainCategory = {
        _id: foundCategory._id,
        name: foundCategory.name,
        slug: slugify(foundCategory.name, { lower: true }),
      };

      if (subCategory) {
        const foundSubCategory = foundCategory.subcat.find(
          (sub) => sub._id.toString() === subCategory
        );
        if (!foundSubCategory) {
          return res
            .status(404)
            .json({ message: `SubCategory ${subCategory} not found` });
        }
        updateData.subCategory = {
          _id: foundSubCategory._id,
          name: foundSubCategory.name,
          slug: slugify(foundSubCategory.name, { lower: true }),
        };

        if (subSubCategory) {
          const foundSubSubCategory = foundSubCategory.subsubcat.find(
            (subsub) => subsub._id.toString() === subSubCategory
          );
          if (!foundSubSubCategory) {
            return res
              .status(404)
              .json({ message: `SubSubCategory ${subSubCategory} not found` });
          }
          updateData.subSubCategory = {
            _id: foundSubSubCategory._id,
            name: foundSubSubCategory.name,
            slug: slugify(foundSubSubCategory.name, { lower: true }),
          };
        }
      }
    }

    // Handle zones
    if (zones) updateData.zones = zones;

    // Update document
    const updatedBanner = await Banner.updateOne(
      { _id: id },
      { $set: updateData }
    );

    if (updatedBanner.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: "No matching banner or data unchanged." });
    }

    return res
      .status(200)
      .json({ message: "Banner updated successfully.", banner: updatedBanner });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error updating banner.", error: err.message });
  }
};

exports.getAllBanner = async (req, res) => {
  const allBanner = await Banner.find().sort({ createdAt: -1 });
  res.json(allBanner);
};