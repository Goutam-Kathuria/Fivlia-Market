const products = require('../modals/product')

exports.addProduct = async (req,res) => {
    try{
    let {
    name,description,category,subCategory,subSubCategory,price,address,userId
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
    res.status(500).json({ message: "❌ Failed to Add Product", error: error.message });
    }
}