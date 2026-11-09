const authService = require("../services/auth.service");
const asyncHandler = require("../utils/async-handler");

// Register a new business owner
const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);

    res.status(201).json({
        status: "success",
        message: result.message,
        data: {
            user: result.user,
            business: result.business
        }
    });
});

// Login an existing user
const login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);

    res.status(200).json({
        status: "success",
        message: "Login successful.",
        data: result
    });
});

const getMe = asyncHandler(async (req, res) => {
    res.status(200).json({
        status: "success",
        message: "Authenticated user retrieved successfully.",
        data: {
            user: req.user
        }
    });
});

module.exports = {
    register,
    login,
    getMe
};