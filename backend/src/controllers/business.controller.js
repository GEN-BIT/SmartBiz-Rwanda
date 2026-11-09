const asyncHandler = require("../utils/async-handler");
const businessService = require("../services/business.service");

const getDashboard = asyncHandler(async (req, res) => {
    const dashboard = await businessService.getDashboardData(
        req.businessId
    );

    res.status(200).json({
        status: "success",
        message: "Dashboard data retrieved successfully.",
        data: dashboard
    });
});

module.exports = {
    getDashboard
};