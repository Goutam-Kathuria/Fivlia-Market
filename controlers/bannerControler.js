const Banner = require("../modals/banner");
const User = require("../modals/user");
const Category = require("../modals/category");
const BannerPlan = require("../modals/banner_plan");
const { getBannersWithinRadius } = require("../utils/location");
const expireBanner = require("../utils/expireBanner");

const DEFAULT_PLAN_DURATION_DAYS = 30;
const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

const parseBooleanInput = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }

  return null;
};

const parseDurationToDays = (durationText) => {
  if (durationText === undefined || durationText === null) {
    return DEFAULT_PLAN_DURATION_DAYS;
  }

  const rawText = String(durationText).trim().toLowerCase();
  if (!rawText) return DEFAULT_PLAN_DURATION_DAYS;

  const numberMatch = rawText.match(/(\d+(\.\d+)?)/);
  if (!numberMatch) return DEFAULT_PLAN_DURATION_DAYS;

  const amount = Number(numberMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return DEFAULT_PLAN_DURATION_DAYS;
  }

  let multiplier = null;

  if (/\b(year|years|yr|yrs|y)\b/.test(rawText)) {
    multiplier = 365;
  } else if (/\b(month|months|mon|mons|mo)\b/.test(rawText)) {
    multiplier = 30;
  } else if (/\b(week|weeks|wk|wks|w)\b/.test(rawText)) {
    multiplier = 7;
  } else if (/\b(day|days|dy|d)\b/.test(rawText)) {
    multiplier = 1;
  } else if (/^\d+(\.\d+)?$/.test(rawText)) {
    multiplier = 1;
  }

  if (!multiplier) return DEFAULT_PLAN_DURATION_DAYS;

  const totalDays = Math.ceil(amount * multiplier);
  return totalDays > 0 ? totalDays : DEFAULT_PLAN_DURATION_DAYS;
};

const getCategoryIdString = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

exports.banner = async (req, res) => {
  try {
    const userId = req.user;
    let {
      title,
      mainCategory,
      subCategory,
      cityId,
      productId,
      selectedPlanId,
      transactionId,
    } = req.body;
    const rawImagePath = req.files?.image?.[0]?.key || "";
    const image = rawImagePath ? `/${rawImagePath}` : "";

    if (!selectedPlanId || String(selectedPlanId).trim() === "") {
      return res.status(400).json({ message: "selectedPlanId is required" });
    }

    if (!transactionId || String(transactionId).trim() === "") {
      return res.status(400).json({ message: "transactionId is required" });
    }

    if (!mainCategory)
      return res.status(400).json({ message: "Main category is required" });

    let foundCategory = await Category.findOne({ _id: mainCategory });
    if (!foundCategory)
      return res
        .status(404)
        .json({ message: `Category ${mainCategory} not found` });

    const hasSubCategory = subCategory && subCategory.trim() !== "";
    let foundSubCategory = null;

    if (hasSubCategory) {
      foundSubCategory = foundCategory.subcat.find(
        (sub) => sub._id.toString() === subCategory,
      );

      if (!foundSubCategory)
        return res
          .status(404)
          .json({ message: `SubCategory ${subCategory} not found` });
    }

    const selectedPlan =
      await BannerPlan.findById(selectedPlanId).select("_id");
    if (!selectedPlan) {
      return res
        .status(404)
        .json({ message: `Plan ${selectedPlanId} not found` });
    }

    const newBanner = await Banner.create({
      image,
      title,
      userId,
      cityId,
      selectedPlanId: selectedPlan._id,
      aprroveStatus: "pending",
      approvalReason: "",
      productId,
      status: false,
      transactionId: String(transactionId).trim(),
      mainCategory: foundCategory ? foundCategory._id : null,
      subCategory: foundSubCategory ? foundSubCategory._id : null,
    });
    return res
      .status(200)
      .json({ message: "Banner Added Successfully", newBanner });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An Error Occured" });
  }
};

exports.getBanner = async (req, res) => {
  try {
    await expireBanner();

    const { categoryId, myAds } = req.query;
    const userId = req.user;

    if (myAds !== undefined) {
      const myBanners = await Banner.find({ userId })
        .lean()
        .sort({ createdAt: -1 });
      return res.status(200).json({
        message: "Banners fetched successfully.",
        count: myBanners.length,
        data: myBanners,
      });
    }

    const user = await User.findById(userId).lean();

    if (!user || !user?.latitude || !user?.longitude) {
      // console.log("❌ User location missing or incomplete");
      return res.status(400).json({ message: "User location not found" });
    }

    const userLat = user.latitude;
    const userLng = user.longitude;

    // 🔎 Apply base filters
    const filters = { aprroveStatus: "active", status: true };

    const allBanners = await Banner.find(filters)
      .populate("cityId", "city latitude longitude")
      .lean()
      .sort({ createdAt: -1 });

    const normalizedCategoryId = String(categoryId || "").trim();
    const categoryMatchedBanners = normalizedCategoryId
      ? allBanners.filter((bannerItem) => {
          const mainCategoryId = getCategoryIdString(bannerItem.mainCategory);
          const subCategoryId = getCategoryIdString(bannerItem.subCategory);
          return (
            mainCategoryId === normalizedCategoryId ||
            subCategoryId === normalizedCategoryId
          );
        })
      : allBanners;

    const matchedBanners = await getBannersWithinRadius(
      userLat,
      userLng,
      categoryMatchedBanners,
    );

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
        console.log(err);
        return res.status(400).json({ message: "Invalid city format" });
      }
    }

    let cityIds = Array.isArray(city) ? city : [city];

    const cityDoc = await ZoneData.find({ _id: { $in: cityIds } });
    if (cityDoc) {
      updateData.city = cityDoc.map((c) => ({ _id: c._id, name: c.city }));
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
      updateData.mainCategory = foundCategory._id;

      if (subCategory) {
        const foundSubCategory = foundCategory.subcat.find(
          (sub) => sub._id.toString() === subCategory,
        );
        if (!foundSubCategory) {
          return res
            .status(404)
            .json({ message: `SubCategory ${subCategory} not found` });
        }
        updateData.subCategory = foundSubCategory._id;

        if (subSubCategory) {
          const foundSubSubCategory = foundSubCategory.subsubcat.find(
            (subsub) => subsub._id.toString() === subSubCategory,
          );
          if (!foundSubSubCategory) {
            return res
              .status(404)
              .json({ message: `SubSubCategory ${subSubCategory} not found` });
          }
          updateData.subSubCategory = {
            _id: foundSubSubCategory._id,
            name: foundSubSubCategory.name,
          };
        }
      } else {
        updateData.subCategory = null;
      }
    }

    // Handle zones
    if (zones) updateData.zones = zones;

    const existingBanner = await Banner.findById(id).select("aprroveStatus");
    if (!existingBanner)
      return res.status(404).json({ message: "Banner not found" });

    // If banner was asked to resubmit or rejected, any update resubmits it
    if (
      existingBanner.aprroveStatus === "resubmit" ||
      existingBanner.aprroveStatus === "rejected"
    ) {
      updateData.aprroveStatus = "pending";
      updateData.approvalReason = "";
      updateData.status = false;
      updateData.approvedAt = null;
    }

    // Update document
    const updatedBanner = await Banner.updateOne(
      { _id: id },
      { $set: updateData },
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
  try {
    await expireBanner();

    const banners = await Banner.find()
      .sort({ createdAt: -1 })

      // Main category name
      .populate({
        path: "mainCategory",
        select: "name",
      })

      // Sub category name
      .populate({
        path: "subCategory",
        select: "name",
      })

      // City name only
      .populate({
        path: "cityId",
        select: "city",
      })

      // User name + mobile only
      .populate({
        path: "userId",
        select: "name mobileNumber",
      })

      // Plan details
      .populate({
        path: "selectedPlanId",
        select: "duration price",
      });

    return res.json(banners);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error fetching all banners.",
    });
  }
};

exports.updateBannerApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { aprroveStatus, approvalReason = "" } = req.body;

    const valid = ["active", "rejected", "resubmit", "pending", "expired"];
    if (!valid.includes(aprroveStatus)) {
      return res.status(400).json({ message: "Invalid approval status" });
    }

    const existingBanner = await Banner.findById(id).select("selectedPlanId");
    if (!existingBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    const updateData = { aprroveStatus };

    if (aprroveStatus === "active") {
      let selectedPlan = null;

      if (existingBanner.selectedPlanId) {
        selectedPlan = await BannerPlan.findOne({
          _id: existingBanner.selectedPlanId,
          status: true,
        })
          .select("_id duration")
          .lean();
      }

      if (!selectedPlan) {
        selectedPlan = await BannerPlan.findOne({ status: true })
          .sort({ price: 1, createdAt: -1 })
          .select("_id duration")
          .lean();
      }

      if (!selectedPlan) {
        return res.status(400).json({
          message:
            "No active banner plan found. Add at least one active plan first.",
        });
      }

      const now = new Date();
      const durationDays = parseDurationToDays(selectedPlan.duration);
      const toDate = new Date(
        now.getTime() + durationDays * MILLISECONDS_IN_A_DAY,
      );

      updateData.status = true;
      updateData.approvalReason = "";
      updateData.approvedAt = now;
      updateData.fromDate = now;
      updateData.toDate = toDate;
      updateData.selectedPlanId = selectedPlan._id;
    }

    if (aprroveStatus === "rejected" || aprroveStatus === "resubmit") {
      if (!approvalReason || approvalReason.trim() === "") {
        return res.status(400).json({ message: "Approval reason is required" });
      }
      updateData.status = false;
      updateData.approvalReason = approvalReason.trim();
      updateData.approvedAt = null;
    }

    if (aprroveStatus === "pending") {
      updateData.status = false;
      updateData.approvalReason = "";
      updateData.approvedAt = null;
    }

    if (aprroveStatus === "expired") {
      updateData.status = false;
    }

    const updated = await Banner.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updated) {
      return res.status(404).json({ message: "Banner not found" });
    }

    return res.status(200).json({
      message: "Banner approval status updated",
      banner: updated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Error updating banner approval status.",
      error: err.message,
    });
  }
};

exports.addPlans = async (req, res) => {
  try {
    const { duration, price, status } = req.body;

    if (!duration || String(duration).trim() === "") {
      return res.status(400).json({ message: "Duration is required" });
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice)) {
      return res.status(400).json({ message: "Valid price is required" });
    }

    const parsedStatus = parseBooleanInput(status);
    if (status !== undefined && parsedStatus === null) {
      return res.status(400).json({ message: "Status must be true or false" });
    }

    const payload = {
      duration: String(duration).trim(),
      price: parsedPrice,
    };

    if (parsedStatus !== undefined) {
      payload.status = parsedStatus;
    }

    const plan = await BannerPlan.create(payload);

    return res.status(201).json({
      message: "Banner plan added successfully.",
      data: plan,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error adding banner plan.",
    });
  }
};

exports.getPlans = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = {};

    if (String(includeInactive).toLowerCase() !== "true") {
      filter.status = true;
    }

    const plans = await BannerPlan.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Banner plans fetched successfully.",
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error fetching banner plans.",
    });
  }
};

exports.editPlans = async (req, res) => {
  try {
    const { planId } = req.params;

    const update = {};

    if (req.body.duration !== undefined) {
      update.duration = String(req.body.duration).trim();
    }

    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (!Number.isFinite(price)) {
        return res.status(400).json({ message: "Invalid price" });
      }
      update.price = price;
    }

    if (req.body.status !== undefined) {
      update.status =
        req.body.status === true ||
        req.body.status === "true" ||
        req.body.status === 1 ||
        req.body.status === "1";
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const plan = await BannerPlan.findByIdAndUpdate(planId, update, {
      new: true,
    });

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json({
      message: "Plan updated",
      data: plan,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
};
