const express = require("express");
const inventoryController = require("../controllers/inventory.controller");
const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

const router = express.Router();

const readInventoryRoles = [
    "owner",
    "manager",
    "cashier",
    "stock_manager"
];

const manageInventoryRoles = [
    "owner",
    "manager",
    "stock_manager"
];

router.get(
    "/:businessId/inventory",
    authenticate,
    tenantCheck,
    authorize(...readInventoryRoles),
    inventoryController.getInventory
);

router.get(
    "/:businessId/inventory/summary",
    authenticate,
    tenantCheck,
    authorize(...readInventoryRoles),
    inventoryController.getSummary
);

router.get(
    "/:businessId/inventory/movements",
    authenticate,
    tenantCheck,
    authorize(...readInventoryRoles),
    inventoryController.getMovements
);

router.post(
    "/:businessId/inventory/adjustments",
    authenticate,
    tenantCheck,
    authorize(...manageInventoryRoles),
    inventoryController.adjustStock
);

module.exports = router;