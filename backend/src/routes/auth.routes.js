
const express = require("express");

const authController = require("../controllers/auth.controller");
const authLimiter = require("../middleware/rate-limit");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

// Business owner registration
router.post("/register", authLimiter, authController.register);

// User login
router.post("/login", authLimiter, authController.login);

// Get current authenticated user
router.get("/me", authenticate, authController.getMe);

module.exports = router;
