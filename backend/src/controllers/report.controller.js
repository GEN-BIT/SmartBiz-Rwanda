
/*
 * SmartBiz Rwanda - Report Controller
 * Handles business reporting requests.
 */

const reportService = require("../services/report.service");
const AppError = require("../utils/AppError");

function validateBusinessId(value) {
    const businessId = Number(value);

    if (!Number.isSafeInteger(businessId) || businessId <= 0) {
        throw new AppError("Invalid business ID.", 400);
    }

    return businessId;
}

/*
 * Retrieve the Reports dashboard.
 */
async function getDashboardReport(req, res, next) {
    try {
        const businessId = validateBusinessId(req.businessId);

        const report = await reportService.getDashboardReport(
            businessId,
            req.query
        );

        res.status(200).json({
            status: "success",
            message: "Reports retrieved successfully.",
            data: report
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getDashboardReport
};
