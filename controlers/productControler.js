const products = require("../modals/product");

exports.addProduct = async (req, res) => {
  try {
    let userId = req.user;
    let {
      name,
      description,
      category,
      subCategory,
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
    const { userId, categoryId, page = 1, limit = 10, search } = req.query;

    let filter = {};

    // If userId is present → user dashboard → show ALL their ads
    if (userId) {
      filter.userId = userId;
    } 
    else {
      // Public listing → only active products
      filter.productStatus = "active";
    }

    if (categoryId) filter.category = categoryId;

    // Only hide expired products in PUBLIC LISTING
    if (!userId) {
      filter.expiresAt = { $gt: new Date() };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    let usePagination = false;

    if (!userId && !categoryId && !search) {
      usePagination = true;
    }

    let query = products
      .find(filter)
      .populate("category")
      .populate("subCategory")
      .populate("userId")
      .sort({ createdAt: -1 });

    let total = 0;

    if (usePagination) {
      total = await products.countDocuments(filter);
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(Number(limit));
    }

    const product = await query;

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

    const {
      name,
      description,
      price,
      address,
      category,
      subCategory,
    } = req.body;

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

    const {
      name,
      description,
      price,
      address,
      category,
      subCategory,
    } = req.body;

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
