const Category = require("../modals/category");

// ---------------- CREATE OR UPDATE CATEGORY ----------------
exports.saveCategory = async (req, res) => {
  try {
    const { id, name, description, status } = req.body;
    let { attribute, city, filter } = req.body;

    // Parse array fields
    if (typeof attribute === "string") {
      try {
        attribute = JSON.parse(attribute);
      } catch {
        attribute = [];
      }
    }
    if (typeof filter === "string") {
      try {
        filter = JSON.parse(filter);
      } catch {
        filter = [];
      }
    }

    if (typeof city === "string") {
      try {
        city = JSON.parse(city);
      } catch {
        city = [];
      }
    }

    const image = `/${req.files?.image?.[0]?.key}` || req.body.image || "";

    let category;
    if (id) {
      // Update
      category = await Category.findByIdAndUpdate(
        id,
        { name, description, attribute, filter, city, status, image },
        { new: true }
      );
      if (!category)
        return res.status(404).json({ message: "❌ Category not found" });
    } else {
      // Create
      category = await Category.create({
        name,
        description,
        attribute,
        city,
        filter,
        image,
      });
    }

    res.status(200).json({
      message: id
        ? "✅ Category updated successfully"
        : "✅ Category created successfully",
      category,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "❌ Failed to save category", error: err.message });
  }
};

// ---------------- GET ALL / SINGLE CATEGORY ----------------
// (UNCHANGED RESPONSE FORMAT)
exports.getCategories = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      const category = await Category.findById(id);
      if (!category)
        return res.status(404).json({ message: "❌ Category not found" });

      return res.status(200).json({
        message: "✅ Category fetched successfully",
        category,
      });
    }

    const categories = await Category.find();
    res.status(200).json({
      message: "✅ All categories fetched successfully",
      count: categories.length,
      categories,
    });
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({
      message: "❌ Failed to fetch categories",
      error: err.message,
    });
  }
};

// ---------------- DELETE ANY LEVEL (CAT / SUB / SUB-SUB) ----------------
exports.deleteEntity = async (req, res) => {
  try {
    const { catId } = req.params;
    const { subId } = req.query;
    if (!catId)
      return res.status(400).json({ message: "❌ Category ID is required" });

    const category = await Category.findById(catId);
    if (!category)
      return res.status(404).json({ message: "❌ Category not found" });

    // Delete subcategory
    if (subId) {
      const sub = category.subcat.id(subId);
      if (!sub)
        return res.status(404).json({ message: "❌ Subcategory not found" });
      sub.deleteOne();
      await category.save();
      return res.json({ message: "✅ Subcategory deleted successfully" });
    }

    // Delete category
    await Category.findByIdAndDelete(catId);
    res.json({ message: "✅ Category deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "❌ Failed to delete entity", error: err.message });
  }
};

// ---------------- ADD OR UPDATE SUB / SUB–SUB CATEGORY ----------------
exports.saveSubEntity = async (req, res) => {
  try {
    const { catId } = req.params;
    const { subId } = req.query;
    let { name, description, attribute, city, commison, status } = req.body;
    const image = `/${req.files?.image?.[0]?.key}` || req.body.image || "";

    if (typeof city === "string") {
      try {
        city = JSON.parse(city);
      } catch {
        city = [];
      }
    }

    if (typeof attribute === "string") {
      try {
        attribute = JSON.parse(attribute);
      } catch {
        attribute = [];
      }
    }

    const category = await Category.findById(catId);
    if (!category)
      return res.status(404).json({ message: "❌ Category not found" });

    // Update Subcategory
    if (subId) {
      const sub = category.subcat.id(subId);
      if (sub) {
        Object.assign(sub, {
          name,
          description,
          attribute,
          commison,
          city,
          status,
          image,
        });
        await category.save();
        return res.json({
          message: "✅ Subcategory updated successfully",
          sub,
        });
      }
    }

    // Add new Subcategory
    category.subcat.push({
      name,
      description,
      image,
      attribute,
      city,
      commison,
    });
    await category.save();

    res.json({
      message: "✅ Subcategory added successfully",
      subcategories: category.subcat,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "❌ Failed to save sub-entity", error: err.message });
  }
};

// ---------------- TOGGLE STATUS (GENERIC) ----------------
exports.toggleStatus = async (req, res) => {
  try {
    const { catId } = req.params;
    const { subId } = req.query;
    const category = await Category.findById(catId);
    if (!category)
      return res.status(404).json({ message: "❌ Category not found" });

    let target = category;

    if (subId) target = category.subcat.id(subId);

    if (!target)
      return res.status(404).json({ message: "❌ Target entity not found" });

    target.status = !target.status;
    await category.save();

    res.json({
      message: `✅ ${target.status ? "Activated" : "Deactivated"} successfully`,
      status: target.status,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "❌ Failed to toggle status", error: err.message });
  }
};
