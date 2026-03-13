const products = require("../modals/product");
const banner = require("../modals/banner");
const Users = require("../modals/user");
const Rating = require("../modals/rating");
const Setting = require("../modals/setting");
const { applyLocationFilter, getDistanceKm } = require("../utils/location");

const DEFAULT_PRODUCT_RADIUS_KM = 20;

const parseRadius = (value, fallback = DEFAULT_PRODUCT_RADIUS_KM) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const addDistanceKm = (items, userLat, userLng) => {
  if (!userLat || !userLng) return items;
  return items.map((item) => {
    const obj = item.toObject ? item.toObject() : item;
    if (obj.latitude && obj.longitude) {
      obj.distanceKm = Number(
        getDistanceKm(userLat, userLng, obj.latitude, obj.longitude).toFixed(2),
      );
    } else {
      obj.distanceKm = null;
    }
    return obj;
  });
};

exports.addProduct = async (req, res) => {
  try {
    let userId = req.user;
    let {
      name,
      description,
      category,
      subCategory,
      latitude,
      longitude,
      price,
      address,
      productType,
    } = req.body;
    const image =
      `/${req.files?.MultipleImage?.[0]?.key}` || req.body.MultipleImage || "";
    category = category || null;
    subCategory = subCategory || null;
    userId = userId || null;
    const newProduct = await products.create({
      name,
      description,
      category,
      subCategory,
      price,
      address,
      productType,
      latitude,
      longitude,
      userId,
      image,
    });
    return res
      .status(200)
      .json({ message: "Product Added Successfully", newProduct });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "❌ Failed to Add Product", error: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { userId, category, page = 1, limit = 10, search } = req.query;
    console.log(req.query);
    let filter = {};

    const cleanSearch = typeof search === "string" ? search.trim() : undefined;

    const isAdmin = !userId && !category && cleanSearch === undefined;

    const isUserOwnListing = userId && !category && cleanSearch === undefined;

    const isBrowseListing = userId && cleanSearch === "";

    const isSearchListing = userId && cleanSearch && cleanSearch.length > 0;

    const isCategoryListing = userId && category;

    // =========================
    // 1️⃣ ADMIN
    // =========================
    if (isAdmin) {
      filter.productStatus = { $in: ["active", "sold", "expired"] };
    }

    // =========================
    // 2️⃣ USER – MY PRODUCTS
    // =========================
    if (isUserOwnListing) {
      filter.userId = userId;
      // no status filter
      // no location filter
    }

    let userLat;
    let userLng;
    let radiusKm = DEFAULT_PRODUCT_RADIUS_KM;

    if (isBrowseListing || isCategoryListing || isSearchListing) {
      const globalSettings = await Setting.findOne().select("radius").lean();
      radiusKm = parseRadius(
        globalSettings?.radius,
        DEFAULT_PRODUCT_RADIUS_KM,
      );
    }

    if (isBrowseListing) {
      filter.productStatus = "active";
      filter.expiresAt = { $gt: new Date() };
      filter.userId = { $ne: userId };
      const user = await Users.findById(userId).select("latitude longitude");

      if (user?.latitude && user?.longitude) {
        userLat = user.latitude;
        userLng = user.longitude;
        applyLocationFilter(filter, userLat, userLng, radiusKm);
      }
    }

    // =========================
    // 3️⃣ USER – CATEGORY LISTING
    // =========================
    if (isCategoryListing) {
      filter.productStatus = "active";
      filter.expiresAt = { $gt: new Date() };
      filter.$or = [{ category: category }, { subCategory: category }];
      filter.userId = { $ne: userId };
      const user = await Users.findById(userId).select("latitude longitude");

      userLat = user.latitude;
      userLng = user.longitude;

      if (userLat && userLng) {
        applyLocationFilter(filter, userLat, userLng, radiusKm);
      }
    }

    // =========================
    // 4️⃣ USER – SEARCH LISTING
    // =========================
    if (isSearchListing) {
      filter.productStatus = "active";
      filter.expiresAt = { $gt: new Date() };
      filter.userId = { $ne: userId };
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];

      const user = await Users.findById(userId).select("latitude longitude");

      userLat = user.latitude;
      userLng = user.longitude;

      if (userLat && userLng) {
        applyLocationFilter(filter, userLat, userLng, radiusKm);
      }
    }

    // =========================
    // PAGINATION (ADMIN ONLY)
    // =========================
    let usePagination = isAdmin;

    let query = products
      .find(filter)
      .select("-ratingSum")
      .populate("category")
      .populate("subCategory")
      .populate("userId")
      .sort({ createdAt: -1 });

    let total = 0;

    if (usePagination) {
      total = await products.countDocuments(filter);
      query = query.skip((page - 1) * limit).limit(Number(limit));
    }

    const productRaw = await query;
    const product = addDistanceKm(productRaw, userLat, userLng);

    return res.status(200).json({
      success: true,
      product,
      total: usePagination ? total : product.length,
      page: usePagination ? Number(page) : null,
      totalPages: usePagination ? Math.ceil(total / limit) : null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "❌ Failed to fetch products",
      error: error.message,
    });
  }
};

exports.getProductForApprovals = async (req, res) => {
  try {
    const banners = await banner
      .find({ aprroveStatus: "pending" })
      .populate("userId", "name email mobileNumber image latitude longitude");
    const Products = await products
      .find({ productStatus: "pending" })
      .populate("userId", "name email mobileNumber image latitude longitude");

    const Approvals = {
      banners: banners.map((item) => ({ ...item._doc, type: "banner" })),
      products: Products.map((item) => ({ ...item._doc, type: "product" })),
    };

    return res
      .status(200)
      .json({ message: "Products fetched successfully", Approvals });
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    return res.status(500).json({
      message: "An error occurred while fetching banners.",
      error: error.message,
    });
  }
};

exports.updateProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const { productStatus } = req.body;

    const valid = ["rejected", "active", "sold"];
    if (!valid.includes(productStatus))
      return res.status(400).json({ message: "Invalid product status" });

    const product = await products.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.productStatus = productStatus;
    await product.save(); // sets expiry if active

    return res.status(200).json({
      message: "Status updated",
      productStatus: product.productStatus,
      expiresAt: product.expiresAt || null,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

exports.editProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await products.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // USER CANNOT EDIT EXPIRED ADS
    if (product.productStatus === "expired") {
      return res
        .status(400)
        .json({ message: "This ad is expired. Please repost." });
    }

    // USER CANNOT EDIT SOLD ADS
    if (product.productStatus === "sold") {
      return res
        .status(400)
        .json({ message: "This ad is sold and cannot be edited." });
    }

    // USER OWNERSHIP CHECK (optional)
    // if (product.userId.toString() !== req.user) {
    //   return res.status(403).json({ message: "Not allowed" });
    // }

    const { name, description, price, address, category, subCategory } =
      req.body;

    // Editable fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (address) product.address = address;

    if (category) product.category = category;
    if (subCategory) product.subCategory = subCategory;

    // Image handling
    if (req.files?.MultipleImage) {
      product.image = req.files.MultipleImage.map((f) => `/${f.key}`);
    }

    await product.save();

    return res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to update product",
      error: error.message,
    });
  }
};

exports.repostProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await products.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.productStatus !== "expired") {
      return res
        .status(400)
        .json({ message: "Only expired ads can be reposted." });
    }

    const { name, description, price, address, category, subCategory } =
      req.body;

    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (address) product.address = address;

    if (category) product.category = category;
    if (subCategory) product.subCategory = subCategory;

    // Image handling
    if (req.files?.MultipleImage) {
      product.image = req.files.MultipleImage.map((f) => `/${f.key}`);
    }

    // Reset expiry timer
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + product.expiryDays);
    product.expiresAt = expiry;

    product.productStatus = "active";

    await product.save();

    return res.status(200).json({
      message: "Ad reposted successfully",
      expiresAt: product.expiresAt,
      status: product.productStatus,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to repost", error: err.message });
  }
};

exports.getPublicListing = async (req, res) => {
  try {
    const userId = req.user;
    const { page = 1, limit } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    let filter = {
      productStatus: "active",
      expiresAt: { $gt: new Date() },
      userId: { $ne: userId },
    };
    const globalSettings = await Setting.findOne().select("radius").lean();
    const radiusKm = parseRadius(
      globalSettings?.radius,
      DEFAULT_PRODUCT_RADIUS_KM,
    );

    const user = await Users.findById(userId).select("latitude longitude");
    const userLat = user.latitude;
    const userLng = user.longitude;

    // 📍 Apply location filter (20 KM)
    applyLocationFilter(filter, userLat, userLng, radiusKm);

    const total = await products.countDocuments(filter);

    const productRaw = await products
      .find(filter)
      .select("-ratingSum")
      .populate("category")
      .populate("subCategory")
      .populate("userId")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const product = addDistanceKm(productRaw, userLat, userLng);

    return res.status(200).json({
      success: true,
      product,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "❌ Failed to fetch products",
    });
  }
};

exports.rateProduct = async (req, res) => {
  try {
    const userId = req.user;
    const { productId } = req.params;
    const { value, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const ratingValue = Number(value);
    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    const product = await products.findById(productId).select("_id");
    if (!product) return res.status(404).json({ message: "Product not found" });

    const existing = await Rating.findOne({ productId, userId }).select(
      "value",
    );

    if (existing) {
      await Rating.findOneAndUpdate(
        { productId, userId },
        { value: ratingValue, comment },
      );

      const delta = ratingValue - existing.value;
      const updated = await products.findByIdAndUpdate(
        productId,
        { $inc: { ratingSum: delta } },
        { new: true },
      );

      const avg =
        updated && updated.ratingCount
          ? updated.ratingSum / updated.ratingCount
          : 0;

      await products.findByIdAndUpdate(productId, {
        rating: Number(avg.toFixed(2)),
      });

      return res.status(200).json({
        message: "Rating updated",
        rating: Number(avg.toFixed(2)),
        ratingCount: updated ? updated.ratingCount : 0,
      });
    }

    await Rating.create({ productId, userId, value: ratingValue, comment });

    const updated = await products.findByIdAndUpdate(
      productId,
      { $inc: { ratingSum: ratingValue, ratingCount: 1 } },
      { new: true },
    );

    const avg =
      updated && updated.ratingCount
        ? updated.ratingSum / updated.ratingCount
        : 0;

    await products.findByIdAndUpdate(productId, {
      rating: Number(avg.toFixed(2)),
    });

    return res.status(200).json({
      message: "Rating saved",
      rating: Number(avg.toFixed(2)),
      ratingCount: updated ? updated.ratingCount : 0,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to rate product",
      error: error.message,
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const userId = req.user;
    const { productId } = req.params;

    const deletedProduct = await products.findOneAndDelete({
      _id: productId,
      userId: userId, // 🔐 only owner can delete
    });

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Product Deleted",
      deletedProduct,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

exports.getUserCategoryWiseProducts = async (req, res) => {
  try {
    const userId = req.user;
    const { category, subCategory } = req.query;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let filter = { userId, productStatus:"active" };
    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;

    const product = await products
      .find(filter)
      .select("_id name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Products fetched successfully",
      product,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};
