const express = require("express");
const Category = require("../models/category");
const Product = require("../models/product");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");

const router = express.Router();

const { verifyToken, authorizeRoles } = require("../middlewares/auth");

//Validate request body - middleware
const validationRules = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
];

//POST
router.post("/", verifyToken, authorizeRoles("admin"), validationRules, async (req, res) => {
  //Validate request body
  let errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({
      message: "Bad request",
      errors: errors.array(),
    });

  //Create category
  try {
    let category = new Category(req.body);
    let result = await category.save();
    res.status(201).send(result);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating category");
  }
});

//PUT
router.put("/:id", verifyToken, authorizeRoles("admin"), validationRules, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(404).send("Category not found");
    let category = await Category.findById(req.params.id);
    if (!category) return res.status(404).send("Category not found");
    //Validate request body
    let errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({
        message: "Bad request",
        errors: errors.array(),
      });

    //Update category
    if (req.body.name) category.name = req.body.name;
    if (req.body.description) category.description = req.body.description;
    let result = await category.save();
    return res.status(200).send(result);
  } catch (err) {
    console.log(err);
    res.status(500).send("Serve error");
  }
});

//GET by ID
router.get("/:id", async (req, res) => {
  try {
    let category = await Category.findById(req.params.id);
    if (!category) return res.status(404).send("Category not found");
    res.status(200).send(category);
  } catch (err) {
    if (err.name === "CastError")
      return res.status(404).send("Category not found");
    console.log(err);
    res.status(500).send("Serve error");
  }
});


//GET all
router.get("/", async (req, res) => {
  try {
    let categories = await Category.find({});
    res.status(200).send(categories);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving categories");
  }
});

// Get products by category ID
router.get("/:id/products", async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const products = await Product.find({ category: categoryId }).populate(
      "category"
    );
    res.status(200).json(products);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ message: "Invalid category ID" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

//Get category by name
router.get("/name/:name", async (req, res) => {
  try {
    let category = await Category.findOne({ name: req.params.name });
    if (!category) return res.status(404).send("Category not found");
    res.status(200).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


//DELETE
router.delete("/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    let category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).send("Category not found");
    return res.status(200).send(category);
  } catch (err) {
    if (err.name === "CastError")
      return res.status(404).send("Category not found");
    console.log(err);
    res.status(500).send("Serve error");
  }
});


//export router
module.exports = router;

