const products = require('../modals/product')

exports.addProduct = async (req,res) => {
    try{
    let userId = req.user
    let {
    name,description,category,subCategory,subSubCategory,price,address
    } = req.body
    const image = `/${req.files?.MultipleImage?.[0]?.key}` || req.body.MultipleImage || ""
    category = category || null;
    subCategory = subCategory || null;
    subSubCategory = subSubCategory || null;
    userId = userId || null;
    const newProduct = await products.create({name,description,category,subCategory,subSubCategory,price,address,userId,image})
    return res.status(200).json({message:'Product Added Successfully'},newProduct)
    }catch(error){
    console.error(error)
    return res.status(500).json({ message: "❌ Failed to Add Product", error: error.message });
    }
}

exports.getProduct = async (req, res) => {
  try {
    const { userId, categoryId } = req.query;

    let filter = {};

    // If userId provided → filter by user products
    if (userId) {
      filter.userId = userId;
    }

    // If categoryId provided → match inside category array
    if (categoryId) {
      filter.category = categoryId;  // since category is an array of ObjectIds
    }

    const product = await products.find(filter)
      .populate("category")
      .populate("subCategory")
      .populate("subSubCategory")
      .populate("userId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: product.length,
      product
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "❌ Failed to fetch products",
      error: error.message
    });
  }
};
