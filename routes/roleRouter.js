const express = require("express");
const Role = require("../models/role");
const { body, validationResult } = require("express-validator");

const router = express.Router();

const roleValidationRules = () => [
    body("name")
        .notEmpty().withMessage("Role name is required")
        .isString().withMessage("Role name must be a string")
        .trim()
];

// Create a new role
router.post("/", roleValidationRules(), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { name } = req.body;
        const newRole = new Role({ name });
        await newRole.save();
        res.status(201).json(newRole);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all roles
router.get("/", async (req, res) => {
    try {
        const roles = await Role.find();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get role by ID
router.get("/:id", async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ message: "Role not found" });
        res.json(role);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a role
router.put("/:id", roleValidationRules(), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const updatedRole = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedRole) return res.status(404).json({ message: "Role not found" });
        res.json(updatedRole);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a role
router.delete("/:id", async (req, res) => {
    try {
        const deletedRole = await Role.findByIdAndDelete(req.params.id);
        if (!deletedRole) return res.status(404).json({ message: "Role not found" });
        res.json({ message: "Role deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
