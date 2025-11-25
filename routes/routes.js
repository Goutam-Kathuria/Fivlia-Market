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
const { banner, getBanner } = require("../controlers/bannerControler");

const { saveLocation } = require("../controlers/locationControler");
// ---------------- AUTH ROUTES ----------------
const { register, login, getUsers, getProfile } = require("../controlers/authControler");
const { addProduct, getProduct } = require("../controlers/productControler");

router.post("/register", register);
router.post("/login", login);

router.post("/save-location", verifyToken, saveLocation);

router.get("/getUsers", getUsers);
router.get("/getProfile", verifyToken, getProfile);
// ---------------- CATEGORY ROUTES ----------------

// Create or Update Category
router.post("/saveCategory", upload, saveCategory);

// Get All or Single Category (⚠️ same response structure kept)
router.get("/getCategories", getCategories);

// ---------------- SUB CATEGORY ROUTES ----------------
// Add or Update Subcategory
router.post("/saveSubEntity/:catId/:subId", upload, saveSubEntity);

// ---------------- DELETE ROUTE ----------------
// Delete Category / Subcategory (based on params)
router.delete("/deleteEntity/:catId/:subId", deleteEntity);

// ---------------- STATUS TOGGLE ----------------
// Toggle Category/Sub Status
router.patch("/toggleStatus/:catId/:subId", toggleStatus);

// ---------------- PRODUCT ROUTES ----------------
router.post("/addProduct", upload,verifyToken, addProduct);
router.get("/getProduct", getProduct);

// ---------------- BANNER ROUTES ----------------
// Add or Update BANNER
router.post("/addBanner", upload, banner);
router.get("/getBanner",verifyToken, getBanner);

module.exports = router;
