const AppError = require("../utils/AppError");

function authorize(...allowedRoles) {
    return function (req, res, next) {
        if (!req.user) {
            return next(new AppError("Please log in first.", 401));
        }

        if (!req.membership) {
            return next(new AppError("Business membership not verified.", 403));
        }

        if (!allowedRoles.includes(req.membership.role)) {
            return next(new AppError("You do not have permission to perform this action.", 403));
        }

        next();
    };
}

module.exports = authorize;