const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Role = require("../models/role");
const UserRole = require("../enums/helper");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");

const router = express.Router();

// Register a new user
router.post("/register", async (req, res) => {
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

        const token = jwt.sign({ email: user.email, role: user.role.name }, process.env.JWT_SECRET, { expiresIn: "1h" });

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

// Route only for admins
router.get("/admin", verifyToken, authorizeRoles(UserRole.ADMIN), (req, res) => {
    res.json({ message: "Only admins can see this!" });
});

// Route only for users
router.get("/", verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.jwtPayload.email }).populate("role");
        if (!user) return res.status(404).json({ message: "User not found!" });
        console.log(user);
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

module.exports = router;
