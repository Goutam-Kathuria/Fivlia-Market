const express = require("express");
const upload = require("../middleware/multer");
const router = express.Router();

const verifyToken = require("../middleware/authToken"); // Optional, if needed
const verifyAdminToken = require("../middleware/adminAuth");

const {
  saveCategory,
  getCategories,
  saveSubEntity,
  deleteEntity,
  toggleStatus,
} = require("../controlers/categoryControler");
const {
  banner,
  getBanner,
  getAllBanner,
  updateBannerStatus,
  updateBannerApproval,
  addPlans,
  editPlans,
  getPlans,
} = require("../controlers/bannerControler");

const { saveLocation, getCity } = require("../controlers/locationControler");
const {
  adminSetting,
  adminLogin,
  getAdminSetting,
  getAppSetting,
  getAdminDashboard,
  createNotification,
  editNotification,
  getNotifications,
  sendNotification,
  addAdminBanner,
} = require("../controlers/adminControler");

// ---------------- AUTH ROUTES ----------------
const {
  register,
  login,
  getUsers,
  getProfile,
  updateFcmToken,
  editProfile,
} = require("../controlers/authControler");
const {
  addProduct,
  getProduct,
  getPublicListing,
  updateProductStatus,
  editProduct,
  repostProduct,
  getProductForApprovals,
  rateProduct,
  deleteProduct,
  getUserCategoryWiseProducts,
} = require("../controlers/productControler");

router.post("/register", register);
router.post("/login", login);
router.post("/admin/login", adminLogin);
router.post("/update-fcm-token", verifyToken, updateFcmToken);
router.post("/edit-profile", upload, verifyToken, editProfile);

router.post("/admin/update-setting", upload, adminSetting);
router.post("/admin/addBanner", verifyAdminToken, upload, addAdminBanner);
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
router.post("/addProduct", upload, verifyToken, addProduct);
router.get("/getProduct", getProduct);
router.get("/get-public-listing", verifyToken, getPublicListing);
router.post("/update-product-status/:productId", verifyAdminToken, updateProductStatus);
router.post("/edit-product/:productId", upload, editProduct);
router.post("/repost-product/:productId", upload, repostProduct);
router.get("/get-product-for-approvals", verifyAdminToken, getProductForApprovals);
router.get("/get-user-category-wise-products", verifyToken, getUserCategoryWiseProducts);
router.post("/rate-product/:productId", verifyToken, rateProduct);
router.delete("/delete-product/:productId", verifyToken, deleteProduct);
// ---------------- BANNER ROUTES ----------------
// Add or Update BANNER
router.post("/addBanner", verifyToken, upload, banner);
router.put("/update-banner-status/:id", upload, updateBannerStatus);
router.post("/update-banner-approval/:id", verifyAdminToken, updateBannerApproval);
router.post("/addPlans", addPlans);
router.post("/edit-elans/:planId", editPlans);
router.get("/getPlans", getPlans);

router.get("/getBanner", verifyToken, getBanner);
router.get("/get-all-banner", verifyAdminToken, getAllBanner);

router.get("/admin/get-setting", getAdminSetting);
router.get("/admin/dashboard", verifyAdminToken, getAdminDashboard);
router.get("/get-app-setting", getAppSetting);

router.post("/create-notification", upload, createNotification);
router.post("/edit-notification/:id", upload, editNotification);
router.get("/get-notification", getNotifications);
router.post("/send-notification", sendNotification);

module.exports = router;
