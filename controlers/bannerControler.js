const Banner = require("../modals/banner");
const User = require("../modals/user");
const Category = require("../modals/category");
const BannerPlan = require("../modals/banner_plan");
const City = require("../modals/city");
const Setting = require("../modals/setting");
const mongoose = require("mongoose");
const { getBannersWithinRadius } = require("../utils/location");
const expireBanner = require("../utils/expireBanner");

const DEFAULT_PLAN_DURATION_DAYS = 30;
const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_BANNER_RADIUS_KM = 20;

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

const parseRadius = (value, fallback = DEFAULT_BANNER_RADIUS_KM) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseDurationToDays = (durationText) => {
  if (durationText === undefined || durationText === null) {
    return DEFAULT_PLAN_DURATION_DAYS;
  }

  let rawText = String(durationText).trim().toLowerCase();
  if (!rawText) return DEFAULT_PLAN_DURATION_DAYS;

  if (rawText === "monthly") rawText = "1 month";
  if (rawText === "yearly") rawText = "1 year";
  if (rawText === "weekly") rawText = "1 week";
  if (rawText === "daily") rawText = "1 day";

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

const normalizeObjectIdInput = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    if (!value.length) return null;
    return normalizeObjectIdInput(value[0]);
  }

  if (typeof value === "object" && value._id !== undefined) {
    return normalizeObjectIdInput(value._id);
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const parseCoordinateInput = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidLatitude = (value) => value >= -90 && value <= 90;
const isValidLongitude = (value) => value >= -180 && value <= 180;

const getCoordinateInputsFromBody = (body = {}) => {
  const latitude = body.latitude !== undefined ? body.latitude : body.lat;
  const longitude =
    body.longitude !== undefined
      ? body.longitude
      : body.lng !== undefined
        ? body.lng
        : body.long;

  return { latitude, longitude };
};

const buildCoordinateFields = (latitude, longitude) => ({
  latitude,
  longitude,
  lat: String(latitude),
  long: String(longitude),
});

const normalizeCityInputValue = (cityInput) => {
  let value = cityInput;

  if (Array.isArray(value)) {
    value = value.length ? value[0] : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        value = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch (error) {
        return { error: { status: 400, message: "Invalid cityId format" } };
      }
    } else {
      value = trimmed;
    }
  }

  return { value };
};

const resolveBannerLocationFields = async ({
  cityInput,
  latitudeInput,
  longitudeInput,
  requireCoordinates = false,
}) => {
  const fields = {};
  let resolvedCity = null;

  if (cityInput !== undefined) {
    const normalizedCityInput = normalizeCityInputValue(cityInput);
    if (normalizedCityInput.error) {
      return normalizedCityInput;
    }

    const normalizedCityId = normalizeObjectIdInput(normalizedCityInput.value);
    if (normalizedCityId === null) {
      fields.cityId = null;
    } else if (!mongoose.Types.ObjectId.isValid(normalizedCityId)) {
      return { error: { status: 400, message: "Invalid cityId" } };
    } else {
      resolvedCity = await City.findById(normalizedCityId)
        .select("_id latitude longitude")
        .lean();
      if (!resolvedCity) {
        return {
          error: { status: 404, message: `City ${normalizedCityId} not found` },
        };
      }

      fields.cityId = resolvedCity._id;
    }
  }

  const parsedLatitude = parseCoordinateInput(latitudeInput);
  const parsedLongitude = parseCoordinateInput(longitudeInput);

  if (parsedLatitude === null || parsedLongitude === null) {
    return {
      error: { status: 400, message: "Invalid latitude or longitude value" },
    };
  }

  const hasLatitudeInput = parsedLatitude !== undefined;
  const hasLongitudeInput = parsedLongitude !== undefined;

  if (hasLatitudeInput !== hasLongitudeInput) {
    return {
      error: {
        status: 400,
        message: "Both latitude and longitude are required together",
      },
    };
  }

  let latitude = hasLatitudeInput ? parsedLatitude : undefined;
  let longitude = hasLongitudeInput ? parsedLongitude : undefined;

  if ((latitude === undefined || longitude === undefined) && resolvedCity) {
    const cityLatitude = parseCoordinateInput(resolvedCity.latitude);
    const cityLongitude = parseCoordinateInput(resolvedCity.longitude);

    if (
      cityLatitude === undefined ||
      cityLongitude === undefined ||
      cityLatitude === null ||
      cityLongitude === null
    ) {
      return {
        error: {
          status: 400,
          message: `City ${resolvedCity._id} does not have valid latitude/longitude`,
        },
      };
    }

    latitude = cityLatitude;
    longitude = cityLongitude;
  }

  if (latitude !== undefined && longitude !== undefined) {
    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
      return {
        error: {
          status: 400,
          message: "Latitude or longitude is out of valid range",
        },
      };
    }

    Object.assign(fields, buildCoordinateFields(latitude, longitude));
  }

  if (
    requireCoordinates &&
    (fields.latitude === undefined || fields.longitude === undefined)
  ) {
    return {
      error: {
        status: 400,
        message:
          "latitude and longitude are required. You can also provide a cityId with valid coordinates",
      },
    };
  }

  return { fields };
};

exports.banner = async (req, res) => {
  try {
    const userId = req.user;
    let {
      title,
      mainCategory,
      subCategory,
      productId,
      selectedPlanId,
      transactionId,
    } = req.body;
    const cityInput =
      req.body.cityId !== undefined ? req.body.cityId : req.body.city;
    const { latitude: latitudeInput, longitude: longitudeInput } =
      getCoordinateInputsFromBody(req.body);
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

    const locationResolution = await resolveBannerLocationFields({
      cityInput,
      latitudeInput,
      longitudeInput,
      requireCoordinates: true,
    });

    if (locationResolution.error) {
      return res
        .status(locationResolution.error.status)
        .json({ message: locationResolution.error.message });
    }

    const newBanner = await Banner.create({
      image,
      title,
      userId,
      ...locationResolution.fields,
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

    const attachSubCategory = (banners) =>
      banners.map((banner) => {
        const sub = banner.mainCategory?.subcat?.find(
          (s) => String(s._id) === String(banner.subCategory),
        );

        return {
          ...banner,

          mainCategory: banner.mainCategory
            ? {
                _id: banner.mainCategory._id,
                name: banner.mainCategory.name,
              }
            : null,

          subCategory: sub
            ? {
                _id: sub._id,
                name: sub.name,
              }
            : null,
        };
      });

    // 👉 MY ADS
    if (myAds !== undefined) {
      const myBanners = await Banner.find({ userId })
        .populate({
          path: "mainCategory",
          select: "name subcat",
        })
        .lean()
        .sort({ createdAt: -1 });

      const bannersWithSubcat = attachSubCategory(myBanners);

      return res.status(200).json({
        message: "Banners fetched successfully.",
        count: bannersWithSubcat.length,
        data: bannersWithSubcat,
      });
    }

    // 👉 USER LOCATION
    const user = await User.findById(userId).lean();
    const userLatitude = parseCoordinateInput(user?.latitude);
    const userLongitude = parseCoordinateInput(user?.longitude);

    if (
      userLatitude === undefined ||
      userLongitude === undefined ||
      userLatitude === null ||
      userLongitude === null
    ) {
      return res.status(400).json({ message: "User location not found" });
    }

    const filters = { aprroveStatus: "active", status: true };
    const globalSettings = await Setting.findOne().select("radius").lean();
    const radiusKm = parseRadius(globalSettings?.radius, DEFAULT_BANNER_RADIUS_KM);

    const allBanners = await Banner.find(filters)
      .populate({
        path: "mainCategory",
        select: "name subcat",
      })
      .lean()
      .sort({ createdAt: -1 });

    const bannersWithSubcat = attachSubCategory(allBanners);

    const normalizedCategoryId = String(categoryId || "").trim();

    const categoryMatchedBanners = normalizedCategoryId
      ? bannersWithSubcat.filter((b) => {
          const mainId = getCategoryIdString(b.mainCategory);
          const subId = getCategoryIdString(b.subCategory);
          return (
            mainId === normalizedCategoryId || subId === normalizedCategoryId
          );
        })
      : bannersWithSubcat;

    const matchedBanners = await getBannersWithinRadius(
      userLatitude,
      userLongitude,
      categoryMatchedBanners,
      radiusKm,
    );

    return res.status(200).json({
      message: "Banners fetched successfully.",
      count: matchedBanners.length,
      data: matchedBanners,
    });
  } catch (error) {
    console.error("❌ Error fetching banners:", error);
    return res.status(500).json({
      message: "An error occurred while fetching banners.",
      data: [],
    });
  }
};

exports.updateBannerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid banner id" });
    }

    const existingBanner = await Banner.findById(id).select(
      "aprroveStatus mainCategory",
    );
    if (!existingBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    const updateData = {};
    const rawImagePath = req.files?.image?.[0]?.key;
    if (rawImagePath) {
      updateData.image = `/${rawImagePath}`;
    }

    if (req.body.title !== undefined) {
      updateData.title = String(req.body.title).trim();
    }

    if (req.body.status !== undefined) {
      const parsedStatus = parseBooleanInput(req.body.status);
      if (parsedStatus === null) {
        return res
          .status(400)
          .json({ message: "Status must be true or false" });
      }
      if (parsedStatus !== undefined) {
        updateData.status = parsedStatus;
      }
    }

    const cityInput =
      req.body.cityId !== undefined ? req.body.cityId : req.body.city;
    const { latitude: latitudeInput, longitude: longitudeInput } =
      getCoordinateInputsFromBody(req.body);

    const locationResolution = await resolveBannerLocationFields({
      cityInput,
      latitudeInput,
      longitudeInput,
      requireCoordinates: false,
    });

    if (locationResolution.error) {
      return res
        .status(locationResolution.error.status)
        .json({ message: locationResolution.error.message });
    }

    Object.assign(updateData, locationResolution.fields);

    const isMainCategoryProvided = req.body.mainCategory !== undefined;
    const isSubCategoryProvided = req.body.subCategory !== undefined;
    const normalizedMainCategoryId = normalizeObjectIdInput(
      req.body.mainCategory,
    );
    const normalizedSubCategoryId = normalizeObjectIdInput(
      req.body.subCategory,
    );

    let resolvedMainCategoryId = existingBanner.mainCategory
      ? String(existingBanner.mainCategory)
      : null;
    let foundCategory = null;

    if (isMainCategoryProvided) {
      if (normalizedMainCategoryId === null) {
        updateData.mainCategory = null;
        updateData.subCategory = null;
        resolvedMainCategoryId = null;
      } else if (!mongoose.Types.ObjectId.isValid(normalizedMainCategoryId)) {
        return res.status(400).json({ message: "Invalid mainCategory id" });
      } else {
        foundCategory = await Category.findById(
          normalizedMainCategoryId,
        ).lean();
        if (!foundCategory) {
          return res
            .status(404)
            .json({
              message: `Category ${normalizedMainCategoryId} not found`,
            });
        }

        updateData.mainCategory = foundCategory._id;
        resolvedMainCategoryId = String(foundCategory._id);

        // Prevent stale subCategory when mainCategory changes.
        if (!isSubCategoryProvided) {
          updateData.subCategory = null;
        }
      }
    }

    if (isSubCategoryProvided) {
      if (normalizedSubCategoryId === null) {
        updateData.subCategory = null;
      } else {
        if (!resolvedMainCategoryId) {
          return res.status(400).json({
            message: "mainCategory is required to set subCategory",
          });
        }

        if (
          !foundCategory ||
          String(foundCategory._id) !== resolvedMainCategoryId
        ) {
          foundCategory = await Category.findById(
            resolvedMainCategoryId,
          ).lean();
        }

        if (!foundCategory) {
          return res
            .status(404)
            .json({ message: `Category ${resolvedMainCategoryId} not found` });
        }

        const foundSubCategory = foundCategory.subcat.find(
          (sub) => String(sub._id) === normalizedSubCategoryId,
        );

        if (!foundSubCategory) {
          return res
            .status(404)
            .json({
              message: `SubCategory ${normalizedSubCategoryId} not found`,
            });
        }

        updateData.subCategory = foundSubCategory._id;
      }
    }

    if (req.body.productId !== undefined) {
      const normalizedProductId = normalizeObjectIdInput(req.body.productId);
      if (normalizedProductId === null) {
        updateData.productId = null;
      } else if (!mongoose.Types.ObjectId.isValid(normalizedProductId)) {
        return res.status(400).json({ message: "Invalid productId" });
      } else {
        updateData.productId = normalizedProductId;
      }
    }

    if (req.body.selectedPlanId !== undefined) {
      const normalizedPlanId = normalizeObjectIdInput(req.body.selectedPlanId);
      if (normalizedPlanId === null) {
        return res
          .status(400)
          .json({ message: "selectedPlanId cannot be empty" });
      }
      if (!mongoose.Types.ObjectId.isValid(normalizedPlanId)) {
        return res.status(400).json({ message: "Invalid selectedPlanId" });
      }

      const selectedPlan =
        await BannerPlan.findById(normalizedPlanId).select("_id");
      if (!selectedPlan) {
        return res
          .status(404)
          .json({ message: `Plan ${normalizedPlanId} not found` });
      }

      updateData.selectedPlanId = selectedPlan._id;
    }

    if (req.body.transactionId !== undefined) {
      const normalizedTransactionId = String(
        req.body.transactionId || "",
      ).trim();
      if (!normalizedTransactionId) {
        return res
          .status(400)
          .json({ message: "transactionId cannot be empty" });
      }
      updateData.transactionId = normalizedTransactionId;
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    // Any change on rejected/resubmit banner sends it back for approval.
    if (
      existingBanner.aprroveStatus === "resubmit" ||
      existingBanner.aprroveStatus === "rejected"
    ) {
      updateData.aprroveStatus = "pending";
      updateData.approvalReason = "";
      updateData.status = false;
      updateData.approvedAt = null;
    }

    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
      },
    );

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
