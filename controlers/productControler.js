const products = require("../modals/product");

exports.addProduct = async (req, res) => {
  try {
    let userId = req.user;
    let {
      name,
      description,
      category,
      subCategory,
      subSubCategory,
      price,
      address,
    } = req.body;
    const image =
      `/${req.files?.MultipleImage?.[0]?.key}` || req.body.MultipleImage || "";
    category = category || null;
    subCategory = subCategory || null;
    subSubCategory = subSubCategory || null;
    userId = userId || null;
    const newProduct = await products.create({
      name,
      description,
      category,
      subCategory,
      subSubCategory,
      price,
      address,
      userId,
      image,
    });
    return res
      .status(200)
      .json({ message: "Product Added Successfully" }, newProduct);
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

    if (userId) filter.userId = userId;

    if (categoryId) filter.category = categoryId;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    let usePagination = false;

    // Apply pagination ONLY if no filters used
    if (!userId && !categoryId && !search) {
      usePagination = true;
    }

    let query = products
      .find(filter)
      .populate("category")
      .populate("subCategory")
      .populate("subSubCategory")
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
      paginationApplied: usePagination,
      total: usePagination ? total : product.length,
      page: usePagination ? Number(page) : null,
      limit: usePagination ? Number(limit) : null,
      totalPages: usePagination ? Math.ceil(total / limit) : null,
      count: product.length,
      product,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "❌ Failed to fetch products",
      error: error.message,
    });
  }
};
