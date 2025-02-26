const express = require("express");
const { body, validationResult } = require("express-validator");
const Category = require("../models/category");
const Product = require("../models/product");
const { default: mongoose } = require("mongoose");
const router = express.Router();
const UserRole = require("../enums/helper");

//Authen
const { verifyToken, authorizeRoles } = require("../middlewares/auth");

// Define validation rules
const productValidationRules = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isNumeric()
    .withMessage("Price must be a number")
    .isFloat({ min: 0 })
    .withMessage("Price must be greater than 0"),
  body("stock")
    .optional()
    .isNumeric()
    .withMessage("Stock must be a number")
    .isInt({ min: 0 })
    .withMessage("Stock must be a greater or equal to 0"),
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Category must be a valid MongoDB id"),
];

// POST a new product
router.post("/", verifyToken, authorizeRoles(UserRole.ADMIN), productValidationRules, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    //Check if the given category exists first
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    const product = new Product(req.body);
    const savedProduct = await product.save();
    const populatedProduct = await Product.findById(savedProduct._id).populate(
      "category"
    );
    res.status(201).json(populatedProduct);
  } catch (error) {
    console.log(err);
    res.status(500).send("Error creating product");
  }
});

// GET all products (optionally filter by category)
router.get("/", async (req, res) => {
  const { category } = req.query;
  try {
    let query = {};
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category))
        return res.status(404).send("Category not found");
      const categoryFound = await Category.findById(category);
      if (!categoryFound) {
        return res.status(404).json({ message: "Category not found" });
      }
      query = { category: category };
      // If category is passed on query params
    }
    const products = await Product.find(query).populate("category");
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// GET a product by id
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(404).send("Product not found");
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error getting product");
  }
});

// PUT update a product by id
router.put("/:id", verifyToken, authorizeRoles(UserRole.ADMIN), productValidationRules, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    //Check if the given category exists first
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(404).send("Product not found");
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    product.name = req.body.name;
    product.description = req.body.description;
    product.price = req.body.price;
    product.stock = req.body.stock;
    product.category = req.body.category;
    const updatedProduct = await product.save();
    const populatedProduct = await Product.findById(
      updatedProduct._id
    ).populate("category");
    res.json(populatedProduct);
  } catch (err) {
    if (err.name === "CastError")
      return res.status(404).send("Product not found");
    console.log(err);
    res.status(500).send("Serve error");
  }
});

// DELETE a product by id
router.delete("/:id", verifyToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(404).send("Product not found");
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).send(product);
  } catch (error) {
    console.error("Error deleting product", error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
