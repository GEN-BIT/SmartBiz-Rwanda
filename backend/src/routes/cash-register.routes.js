
/*
 * SmartBiz Rwanda - Cash Register Routes
 */

const express = require("express");

const router = express.Router();

const cashRegisterController = require("../controllers/cash-register.controller");

const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

// Roles permitted to use cash register functionality.
const cashRegisterRoles = ["owner", "manager", "cashier"];

// Authentication and business membership are required for every route.
router.use(authenticate);
router.use(tenantCheck);

// Open a cash register.
router.post(
    "/:businessId/cash-register/open",
    authorize(...cashRegisterRoles),
    cashRegisterController.openRegister
);

// Retrieve the authenticated employee's current open register.
// Keep this before the dynamic registerId route.
router.get(
    "/:businessId/cash-register/current",
    authorize(...cashRegisterRoles),
    cashRegisterController.getCurrentRegister
);

// Retrieve cash register history.
// Keep this before the dynamic registerId route.
router.get(
    "/:businessId/cash-register/history",
    authorize(...cashRegisterRoles),
    cashRegisterController.getRegisterHistory
);

// Retrieve a specific cash register.
router.get(
    "/:businessId/cash-register/:registerId",
    authorize(...cashRegisterRoles),
    cashRegisterController.getRegisterById
);

// Close a specific cash register.
router.post(
    "/:businessId/cash-register/:registerId/close",
    authorize(...cashRegisterRoles),
    cashRegisterController.closeRegister
);

module.exports = router;
