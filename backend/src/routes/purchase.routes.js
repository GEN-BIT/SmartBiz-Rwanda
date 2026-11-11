const express = require("express");
const purchaseController = require("../controllers/purchase.controller");

const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

const router = express.Router();

const verifyBusiness = [authenticate, tenantCheck];
const viewRoles = authorize("owner", "manager", "stock_manager");
const manageRoles = authorize("owner", "manager", "stock_manager");

router.get(
    "/:businessId/purchases",
    ...verifyBusiness,
    viewRoles,
    purchaseController.getPurchases
);

router.post(
    "/:businessId/purchases",
    ...verifyBusiness,
    manageRoles,
    purchaseController.createPurchase
);

router.get(
    "/:businessId/purchases/:purchaseId",
    ...verifyBusiness,
    viewRoles,
    purchaseController.getPurchase
);

router.post(
    "/:businessId/purchases/:purchaseId/receive",
    ...verifyBusiness,
    manageRoles,
    purchaseController.receivePurchase
);

module.exports = router;
