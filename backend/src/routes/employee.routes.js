
const express = require("express");

const employeeController = require("../controllers/employee.controller");
const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

const router = express.Router();

// GET employees: owners and managers.
router.get(
    "/:businessId/employees",
    authenticate,
    tenantCheck,
    authorize("owner", "manager"),
    employeeController.getEmployees
);

// POST employee: owners only.
router.post(
    "/:businessId/employees",
    authenticate,
    tenantCheck,
    authorize("owner"),
    employeeController.createEmployee
);

// PATCH employee: owners only.
router.patch(
    "/:businessId/employees/:employeeId",
    authenticate,
    tenantCheck,
    authorize("owner"),
    employeeController.updateEmployee
);

module.exports = router;
