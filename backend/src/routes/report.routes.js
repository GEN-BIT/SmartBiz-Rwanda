
/*
 * SmartBiz Rwanda - Report Routes
 * Protected business reporting endpoints.
 */

const express = require("express");

const router = express.Router();

const reportController = require("../controllers/report.controller");

const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

// Only business owners and managers can view business reports.
const reportRoles = ["owner", "manager"];

// Verify authentication and active business membership.
router.use(authenticate);
router.use(tenantCheck);

// Retrieve the Reports dashboard.
router.get(
    "/:businessId/reports/dashboard",
    authorize(...reportRoles),
    reportController.getDashboardReport
);

module.exports = router;
