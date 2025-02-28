const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Role = require("../models/role");
const UserRole = require("../enums/helper");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const { body, validationResult } = require("express-validator");

const router = express.Router();

const userValidationRules = () => [
    body("username")
        .notEmpty().withMessage("Username is required")
        .isLength({ min: 3 }).withMessage("Username must be at least 3 characters long"),

    body("email")
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email format"),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
];

// Register a new user
router.post("/register", userValidationRules(), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: "All fields are required!" });
        } //validate username, email, password, role - simalr to productValidationRules

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: "Username or email already exists!" });
        }

        const userRole = await Role.findOne({ name: role });
        if (!userRole) {
            return res.status(400).json({ message: `Invalid role: ${role}. Allowed roles: user, admin.` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: userRole._id,
        });

        await newUser.save();
        res.status(201).json({ message: "Registration successful!" });

    } catch (error) {
        res.status(500).json({ message: "Server error!", error: error.message });
    }
});

// Login a user
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body; //validate email, password
        const user = await User.findOne({ email }).populate("role");

        if (!user) return res.status(400).json({ message: "Incorrect email or password!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Incorrect email or password!" });

        const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role.name }, process.env.JWT_SECRET, { expiresIn: "1h" });

        // res.cookie("token", token, {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === "production",
        //     sameSite: "Strict",
        //     maxAge: 3600000 // 1 hour 
        // });

        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role.name,
            },
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error!", error: error.message });

    }
});

// Test route only for admins
router.get("/admin", verifyToken, authorizeRoles(UserRole.ADMIN), (req, res) => {
    res.json({ message: "Only admins can see this!" });
});

// Test route only for users
router.get("/", verifyToken, authorizeRoles(UserRole.USER), async (req, res) => {
    try {
        const user = await User.findOne({ email: req.jwtPayload.email }).populate("role");
        if (!user) return res.status(404).json({ message: "User not found!" });
        res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role.name,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error!" });
    }
});

//Get all users of all roles (only admin can view)
router.get("/all", verifyToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
    try {
        const users = await User.find().populate("role");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error!", error: error.message });
    }
});


//Get all users with the role "user" (anyone can view)
router.get("/users", verifyToken, async (req, res) => {
    try {
        const userRole = await Role.findOne({ name: "user" });
        const users = await User.find({ role: userRole._id }).populate("role");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error!", error: error.message });
    }
});

//Get all users with the role "admin" (anyone can view)
router.get("/admins", verifyToken, async (req, res) => {
    try {
        const adminRole = await Role.findOne({ name: "admin" });
        const admins = await User.find({ role: adminRole._id }).populate("role");
        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: "Server error!", error: error.message });
    }
});

//Get all users with the role "user" (only admin can view)
router.get("/users/admin", verifyToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
    try {
        const userRole = await Role.findOne({ name: "user" });
        const users = await User.find({ role: userRole._id }).populate("role");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error!", error: error.message });
    }
});

//Get all users with the role "admin" (only admin can view)
router.get("/admins/admin", verifyToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
    try {
        const adminRole = await Role.findOne({ name: "admin" });
        const admins = await User.find({ role: adminRole._id }).populate("role");
        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: "Server error!", error: error.message });
    }
});

//Update user - only update your own account 
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the ID is valid
        if (!req.jwtPayload || !req.jwtPayload.id) {
            return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
        }

        const userIdFromToken = req.jwtPayload.id.toString();

        // console.log("Param ID:", id);
        // console.log("JWT Payload ID:", userIdFromToken);

        if (userIdFromToken !== id) {
            return res.status(403).json({ message: "You can only update your own account!" });
        }

        const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        res.json({ message: "Update successful!", user: updatedUser });

    } catch (error) {
        res.status(500).json({ message: "Server error!", error: error.message });
    }
});


//Delete user - only delete your own account
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if req.jwtPayload exists
        if (req.jwtPayload.id !== id) {
            return res.status(403).json({ message: "You can only delete your own account!" });
        }

        // Check if the ID is valid
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid user ID!" });
        }

        // Remove user from database
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        res.json({ message: "Account deleted successfully!" });

    } catch (error) {
        res.status(500).json({ message: "Server error!", error: error.message });
    }
});

//Admin can delete any user (delete by ID)
router.delete("/delete/:id", verifyToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).populate("role");

        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        await User.findByIdAndDelete(id);
        res.json({ message: `User with ID ${id} deleted successfully!` });

    } catch (error) {
        res.status(500).json({ message: "Server error!", error: error.message });
    }
});


module.exports = router;
