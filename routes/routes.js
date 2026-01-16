const express = require("express");
const upload = require("../middleware/multer");
const router = express.Router();

const verifyToken = require("../middleware/authToken"); // Optional, if needed

const {
  saveCategory,
  getCategories,
  saveSubEntity,
  deleteEntity,
  toggleStatus
} = require("../controlers/categoryControler");
const { banner, getBanner, getAllBanner, updateBannerStatus } = require("../controlers/bannerControler");

const { saveLocation, getCity } = require("../controlers/locationControler");
// ---------------- AUTH ROUTES ----------------
const { register, login, getUsers, getProfile } = require("../controlers/authControler");
const { addProduct, getProduct, getPublicListing, updateProductStatus, editProduct, repostProduct, getProductForApprovals } = require("../controlers/productControler");

router.post("/register", register);
router.post("/login", login);

router.post("/save-location", verifyToken, saveLocation);
router.get("/get-city", getCity);
router.get("/getUsers", getUsers);
router.get("/getProfile", verifyToken, getProfile);
// ---------------- CATEGORY ROUTES ----------------

// Create or Update Category
router.post("/saveCategory", upload, saveCategory);

// Get All or Single Category (⚠️ same response structure kept)
router.get("/getCategories", getCategories);

// ---------------- SUB CATEGORY ROUTES ----------------
// Add or Update Subcategory
router.post("/saveSubEntity/:catId", upload, saveSubEntity);

// ---------------- DELETE ROUTE ----------------
// Delete Category / Subcategory (based on params)
router.delete("/deleteEntity/:catId", deleteEntity);

// ---------------- STATUS TOGGLE ----------------
// Toggle Category/Sub Status
router.patch("/toggleStatus/:catId", toggleStatus);

// ---------------- PRODUCT ROUTES ----------------
router.post("/addProduct", upload,verifyToken, addProduct);
router.get("/getProduct", getProduct);
router.get("/get-public-listing", verifyToken, getPublicListing);
router.post("/update-product-status/:productId", updateProductStatus);
router.post("/edit-product/:productId", upload, editProduct);
router.post("/repost-product/:productId", upload, repostProduct);
router.get("/get-product-for-approvals", getProductForApprovals);
// ---------------- BANNER ROUTES ----------------
// Add or Update BANNER
router.post("/addBanner",verifyToken, upload, banner);
router.put("/update-banner-status/:id", upload, updateBannerStatus); 

router.get("/getBanner",verifyToken, getBanner);
router.get("/get-all-banner", getAllBanner);

module.exports = router;
