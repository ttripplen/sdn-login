const jwt = require("jsonwebtoken");
const User = require("../models/user");

const verifyToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "No token provided, access denied!" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Assign user to request object
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token!" });
    }
};

const authorizeRoles = (...roles) => {
    return async (req, res, next) => {
        const user = await User.findById(req.user.id).populate("role");
        if (!user || !roles.includes(user.role.name)) {
            return res.status(403).json({ message: "You do not have permission to access this resource!" });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    authorizeRoles,
};
