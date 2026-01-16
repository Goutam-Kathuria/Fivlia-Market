const products = require("../modals/product");
const banner = require("../modals/banner");
const { applyLocationFilter } = require("../utils/location");
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

    const isAdmin = !userId && !categoryId && !search;
    const isUserOwnListing = userId && !categoryId && !search;
    const isCategoryListing = userId && categoryId;
    const isSearchListing = userId && search;

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

    // =========================
    // 3️⃣ USER – CATEGORY LISTING
    // =========================
    if (isCategoryListing) {
      filter.productStatus = "active";
      filter.expiresAt = { $gt: new Date() };
      filter.$or = [{ category: categoryId }, { subCategory: categoryId }];

      const userLat = req.user?.latitude;
      const userLng = req.user?.longitude;

      if (userLat && userLng) {
        applyLocationFilter(filter, userLat, userLng, 20);
      }
    }

    // =========================
    // 4️⃣ USER – SEARCH LISTING
    // =========================
    if (isSearchListing) {
      filter.productStatus = "active";
      filter.expiresAt = { $gt: new Date() };

      console.log("1", filter);
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
      console.log("2", filter);
      const userLat = req.user?.latitude;
      const userLng = req.user?.longitude;

      if (userLat && userLng) {
        applyLocationFilter(filter, userLat, userLng, 20);
      }
      console.log("final", filter);
    }

    // =========================
    // PAGINATION (ADMIN ONLY)
    // =========================
    let usePagination = isAdmin;

    let query = products
      .find(filter)
      .populate("category")
      .populate("subCategory")
      .populate("userId")
      .sort({ createdAt: -1 });

    let total = 0;

    if (usePagination) {
      total = await products.countDocuments(filter);
      query = query.skip((page - 1) * limit).limit(Number(limit));
    }

    const product = await query;
    console.log("last", product);
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
    const { userId, latitude, longitude } = req.user;
    const { page = 1, limit = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "User location not found",
      });
    }

    let filter = {
      productStatus: "active",
      expiresAt: { $gt: new Date() },
    };

    // 📍 Apply location filter (20 KM)
    applyLocationFilter(filter, latitude, longitude, 20);

    const total = await products.countDocuments(filter);

    const product = await products
      .find(filter)
      .populate("category")
      .populate("subCategory")
      .populate("userId")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

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
