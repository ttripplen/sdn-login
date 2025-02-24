const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Role = require("../models/role");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");

const router = express.Router();

// Đăng ký người dùng
router.post("/register", async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: "All fields are required!" });
        }

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

// Đăng nhập người dùng
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).populate("role");

        if (!user) return res.status(400).json({ message: "Email does not exist!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Incorrect password!" });

        const token = jwt.sign({ id: user._id, role: user.role.name }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 3600000 // 1 giờ
        });

        res.status(200).json({
            message: "Login successful!",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role.name,
            },
        });

    } catch (error) {
        res.status(500).json({ message: "Server error!", error: error.message });
    }
});

// Route chỉ dành cho Admin
router.get("/admin", verifyToken, authorizeRoles("admin"), (req, res) => {
    res.json({ message: "Only admins can see this!" });
});

// Route để lấy thông tin người dùng
router.get("/user", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("role");
        if (!user) return res.status(404).json({ message: "User not found!" });

        res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role.name,
        });

    } catch (error) {
        res.status(500).json({ message: "Server error!" });
    }
});

module.exports = router;
