const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AppError("Authentication token required.", 401);
        }

        const token = authHeader.split(" ")[1];

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            userId: String(decoded.sub),
            email: decoded.email
        };

        next();

    } catch (error) {
        if (error instanceof AppError) {
            return next(error);
        }

        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return next(new AppError("Invalid or expired token.", 401));
        }

        next(error);
    }
}

module.exports = authenticate;