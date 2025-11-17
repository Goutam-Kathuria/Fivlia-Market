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

// ---------------- AUTH ROUTES ----------------
const { register, login } = require("../controlers/authControler");
const { addProduct } = require("../controlers/productControler");
router.post("/register", register);
router.post("/login", login);

// ---------------- CATEGORY ROUTES ----------------

// Create or Update Category
router.post("/saveCategory", upload, saveCategory);

// Get All or Single Category (⚠️ same response structure kept)
router.get("/getCategories", getCategories);

// ---------------- SUB / SUB–SUB CATEGORY ROUTES ----------------
// Add or Update Sub / Sub–Subcategory
router.post("/saveSubEntity/:catId/:subId/:subSubId", upload, saveSubEntity);

// ---------------- DELETE ROUTE ----------------
// Delete Category / Subcategory / Sub–Subcategory (based on params)
router.delete("/deleteEntity/:catId/:subId/:subSubId", deleteEntity);

// ---------------- STATUS TOGGLE ----------------
// Toggle Category/Sub/Sub–Sub Status
router.patch("/toggleStatus/:catId/:subId/:subSubId", toggleStatus);

// ---------------- PRODUCT ROUTES ----------------
router.post("/addProduct", upload,verifyToken, addProduct);
module.exports = router;
