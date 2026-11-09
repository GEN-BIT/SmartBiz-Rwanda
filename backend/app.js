require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const appConfig = require("./src/config/app-config");
const errorHandler = require("./src/middleware/error-handler");

const authRoutes = require("./src/routes/auth.routes");
const businessRoutes = require("./src/routes/business.routes");

const app = express();

// Security headers
app.use(helmet());

// Allow frontend communication
app.use(cors({
    origin: appConfig.corsOrigin
}));

// Read incoming JSON data
app.use(express.json({
    limit: appConfig.jsonLimit
}));

// Read form data
app.use(express.urlencoded({
    extended: true,
    limit: appConfig.jsonLimit
}));

// Welcome route
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Welcome to SmartBiz Rwanda API!"
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "success",
        message: "SmartBiz Rwanda backend is running"
    });
});

// Authentication routes
app.use(`${appConfig.apiPrefix}/auth`, authRoutes);

// Business routes
app.use(`${appConfig.apiPrefix}/businesses`, businessRoutes);

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        status: "error",
        message: "Route not found"
    });
});

// Central error handler
app.use(errorHandler);

module.exports = app;