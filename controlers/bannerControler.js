const Banner = require("../modals/banner");
const User = require("../modals/user");
const Category = require("../modals/category");
const BannerPlan = require("../modals/banner_type");
const Setting = require("../modals/setting");
const mongoose = require("mongoose");
const { getBannersWithinRadius } = require("../utils/location");
const expireBanner = require("../utils/expireBanner");
const { validateBannerImageSize } = require("../utils/bannerImage");
const {
  recordBannerEarning,
  attachBannerEarnings,
} = require("../utils/bannerEarnings");
const {
  CATEGORY_BANNER_PLAN_TYPE,
  parseBooleanInput,
  parseRadius,
  normalizeObjectIdInput,
  parseCoordinateInput,
  getCoordinateInputsFromBody,
  resolveBannerCoordinates,
  normalizePlanType,
  isCategoryBannerPlanType,
  isHomeBannerPlanType,
  normalizeProductIds,
  getBannerExpiryDate,
  attachSubCategory,
} = require("../utils/bannerHelpers");

const DEFAULT_BANNER_RADIUS_KM = 20;

exports.banner = async (req, res) => {
  try {
    const userId = req.user;
    const {
      title,
      mainCategory,
      subCategory,
      productId,
      selectedPlanId,
      transactionId,
    } = req.body;
    const { latitude: latitudeInput, longitude: longitudeInput } =
      getCoordinateInputsFromBody(req.body);
    const rawImagePath = req.files?.image?.[0]?.key || "";
    const image = rawImagePath ? `/${rawImagePath}` : "";

    if (rawImagePath) {
      const sizeCheck = await validateBannerImageSize({
        key: rawImagePath,
        expectedWidth: 1280,
        expectedHeight: 540,
      });
      if (sizeCheck.error) {
        return res
          .status(sizeCheck.error.status)
          .json({ message: sizeCheck.error.message });
      }
    }

    const normalizedPlanId = normalizeObjectIdInput(selectedPlanId);
    if (!normalizedPlanId) {
      return res.status(400).json({ message: "selectedPlanId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(normalizedPlanId)) {
      return res.status(400).json({ message: "Invalid selectedPlanId" });
    }

    if (!transactionId || String(transactionId).trim() === "") {
      return res.status(400).json({ message: "transactionId is required" });
    }

    const selectedPlan = await BannerPlan.findOne({
      _id: normalizedPlanId,
      status: true,
    })
      .select("_id type status price")
      .lean();
    if (!selectedPlan) {
      return res
        .status(404)
        .json({ message: `Plan ${normalizedPlanId} not found or inactive` });
    }

    let foundCategory = null;
    let foundSubCategory = null;

    if (!mainCategory) {
      return res.status(400).json({ message: "Main category is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(String(mainCategory))) {
      return res.status(400).json({ message: "Invalid mainCategory id" });
    }

    if (!subCategory || String(subCategory).trim() === "") {
      return res.status(400).json({ message: "Sub category is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(String(subCategory))) {
      return res.status(400).json({ message: "Invalid subCategory id" });
    }

    foundCategory = await Category.findOne({ _id: mainCategory });
    if (!foundCategory) {
      return res
        .status(404)
        .json({ message: `Category ${mainCategory} not found` });
    }

    foundSubCategory = foundCategory.subcat.find(
      (sub) => sub._id.toString() === String(subCategory),
    );

    if (!foundSubCategory) {
      return res
        .status(404)
        .json({ message: `SubCategory ${subCategory} not found` });
    }

    const productResolution = normalizeProductIds(productId, {
      required: true,
    });

    if (productResolution.error) {
      return res
        .status(productResolution.error.status)
        .json({ message: productResolution.error.message });
    }

    const locationResolution = resolveBannerCoordinates({
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
      productId: productResolution.productIds,
      status: false,
      transactionId: String(transactionId).trim(),
      mainCategory: foundCategory?._id || null,
      subCategory: foundSubCategory?._id || null,
      addedBy: "user",
    });

    await recordBannerEarning({
      transactionId,
      userId,
      bannerId: newBanner._id,
      selectedPlan,
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

    // 👉 MY ADS
    if (myAds !== undefined) {
      const myBanners = await Banner.find({ userId })
        .populate({
          path: "mainCategory",
          select: "name subcat",
        })
        .populate({
          path: "productId",
        })
        .populate({
          path: "selectedPlanId",
          select: "type price",
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
    const radiusKm = parseRadius(
      globalSettings?.radius,
      DEFAULT_BANNER_RADIUS_KM,
    );

    const allBanners = await Banner.find(filters)
      .populate({
        path: "mainCategory",
        select: "name subcat",
      })
      .populate({
        path: "productId",
      })
      .populate({
        path: "selectedPlanId",
        select: "type price",
      })
      .lean()
      .sort({ createdAt: -1 });

    console.log(`Fetched ${allBanners.length} active banners from DB`);
    let bannersWithSubcat = attachSubCategory(allBanners);

    const normalizedCategoryId = String(categoryId || "").trim();

    // Home screen returns only home banners.
    if (!normalizedCategoryId) {
      bannersWithSubcat = bannersWithSubcat.filter((banner) =>
        isHomeBannerPlanType(banner.selectedPlanId?.type),
      );
    } else {
      if (!mongoose.Types.ObjectId.isValid(normalizedCategoryId)) {
        return res.status(400).json({ message: "Invalid categoryId" });
      }

      const isMainCategory = await Category.findById(normalizedCategoryId)
        .select("_id")
        .lean();

      const homeBanners = bannersWithSubcat.filter(
        (banner) =>
          isHomeBannerPlanType(banner.selectedPlanId?.type) &&
          String(banner.mainCategory?._id || banner.mainCategory) ===
            normalizedCategoryId,
      );
      
      let categoryMatched = [];

      if (isMainCategory) {
        categoryMatched = bannersWithSubcat.filter(
          (banner) =>
            String(banner.mainCategory?._id || banner.mainCategory) ===
            normalizedCategoryId,
        );
      } else {
        const isSubCategory = await Category.findOne({
          "subcat._id": normalizedCategoryId,
        })
          .select("_id")
          .lean();

        if (!isSubCategory) {
          return res.status(404).json({ message: "Category not found" });
        }

        categoryMatched = bannersWithSubcat.filter(
          (banner) =>
            String(banner.subCategory?._id || banner.subCategory) ===
            normalizedCategoryId,
        );
      }

      const seenBannerIds = new Set();
      bannersWithSubcat = [...homeBanners, ...categoryMatched].filter(
        (banner) => {
          const bannerId = String(banner._id);
          if (seenBannerIds.has(bannerId)) return false;
          seenBannerIds.add(bannerId);
          return true;
        },
      );
    }
    const matchedBanners = await getBannersWithinRadius(
      userLatitude,
      userLongitude,
      bannersWithSubcat,
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
      "aprroveStatus mainCategory subCategory selectedPlanId",
    );
    if (!existingBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    const updateData = {};
    const rawImagePath = req.files?.image?.[0]?.key;
    if (rawImagePath) {
      const sizeCheck = await validateBannerImageSize({
        key: rawImagePath,
        expectedWidth: 1280,
        expectedHeight: 540,
      });
      if (sizeCheck.error) {
        return res
          .status(sizeCheck.error.status)
          .json({ message: sizeCheck.error.message });
      }
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

    const { latitude: latitudeInput, longitude: longitudeInput } =
      getCoordinateInputsFromBody(req.body);

    const locationResolution = resolveBannerCoordinates({
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

    let selectedPlan = null;
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

      const resolvedSelectedPlan = await BannerPlan.findOne({
        _id: normalizedPlanId,
        status: true,
      })
        .select("_id type")
        .lean();
      if (!resolvedSelectedPlan) {
        return res
          .status(404)
          .json({ message: `Plan ${normalizedPlanId} not found or inactive` });
      }

      updateData.selectedPlanId = resolvedSelectedPlan._id;
      selectedPlan = resolvedSelectedPlan;
    } else if (existingBanner.selectedPlanId) {
      selectedPlan = await BannerPlan.findById(existingBanner.selectedPlanId)
        .select("_id type")
        .lean();
    }

    const requiresCategory = isCategoryBannerPlanType(selectedPlan?.type);
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
    let resolvedSubCategoryId = existingBanner.subCategory
      ? String(existingBanner.subCategory)
      : null;
    let foundCategory = null;

    if (!requiresCategory && req.body.selectedPlanId !== undefined) {
      updateData.mainCategory = null;
      updateData.subCategory = null;
      resolvedMainCategoryId = null;
      resolvedSubCategoryId = null;
    }

    if (isMainCategoryProvided) {
      if (normalizedMainCategoryId === null) {
        return res.status(400).json({ message: "mainCategory is required" });
      }

      if (!mongoose.Types.ObjectId.isValid(normalizedMainCategoryId)) {
        return res.status(400).json({ message: "Invalid mainCategory id" });
      }

      foundCategory = await Category.findById(normalizedMainCategoryId).lean();
      if (!foundCategory) {
        return res
          .status(404)
          .json({ message: `Category ${normalizedMainCategoryId} not found` });
      }

      updateData.mainCategory = foundCategory._id;
      resolvedMainCategoryId = String(foundCategory._id);

      if (requiresCategory && !isSubCategoryProvided) {
        return res.status(400).json({
          message: "subCategory is required when mainCategory is updated",
        });
      }
    }

    if (isSubCategoryProvided) {
      if (normalizedSubCategoryId === null) {
        return res.status(400).json({ message: "subCategory is required" });
      }

      if (!resolvedMainCategoryId) {
        return res.status(400).json({
          message: "mainCategory is required to set subCategory",
        });
      }

      if (
        !foundCategory ||
        String(foundCategory._id) !== resolvedMainCategoryId
      ) {
        foundCategory = await Category.findById(resolvedMainCategoryId).lean();
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
      resolvedSubCategoryId = String(foundSubCategory._id);
    }

    if (requiresCategory) {
      if (!resolvedMainCategoryId) {
        return res.status(400).json({
          message: `${CATEGORY_BANNER_PLAN_TYPE} requires mainCategory`,
        });
      }

      if (!resolvedSubCategoryId) {
        return res.status(400).json({
          message: `${CATEGORY_BANNER_PLAN_TYPE} requires subCategory`,
        });
      }
    }

    if (req.body.productId !== undefined) {
      const productResolution = normalizeProductIds(req.body.productId, {
        required: true,
      });

      if (productResolution.error) {
        return res
          .status(productResolution.error.status)
          .json({ message: productResolution.error.message });
      }

      updateData.productId = productResolution.productIds;
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

    const banners = await Banner.find({ aprroveStatus: { $ne: "pending" } })
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

      // User name + mobile only
      .populate({
        path: "userId",
        select: "name mobileNumber",
      })

      // Plan details
      .populate({
        path: "selectedPlanId",
        select: "type price",
      })
      .lean();

    const bannersWithEarnings = await attachBannerEarnings(banners);

    return res.json(bannersWithEarnings);
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
      if (!existingBanner.selectedPlanId) {
        return res.status(400).json({ message: "selectedPlanId is required" });
      }

      const selectedPlan = await BannerPlan.findById(
        existingBanner.selectedPlanId,
      )
        .select("_id status")
        .lean();

      if (!selectedPlan) {
        return res.status(404).json({
          message: `Plan ${existingBanner.selectedPlanId} not found`,
        });
      }

      if (!selectedPlan.status) {
        return res.status(400).json({ message: "Banner plan is inactive" });
      }

      const now = new Date();
      const toDate = getBannerExpiryDate(now);

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
    const { type, price, status } = req.body;

    const normalizedType = normalizePlanType(type);
    if (!normalizedType) {
      return res.status(400).json({ message: "Valid plan type is required" });
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
      type: normalizedType,
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

    if (req.body.type !== undefined) {
      const normalizedType = normalizePlanType(req.body.type);
      if (!normalizedType) {
        return res.status(400).json({ message: "Invalid plan type" });
      }
      update.type = normalizedType;
    }

    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (!Number.isFinite(price)) {
        return res.status(400).json({ message: "Invalid price" });
      }
      update.price = price;
    }

    if (req.body.status !== undefined) {
      const parsedStatus = parseBooleanInput(req.body.status);
      if (parsedStatus === null) {
        return res
          .status(400)
          .json({ message: "Status must be true or false" });
      }
      update.status = parsedStatus;
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
