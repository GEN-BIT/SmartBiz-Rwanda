/*
 * SmartBiz Rwanda - Sales Routes
 */

const express = require("express");
const salesController = require("../controllers/sales.controller");

const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

const router = express.Router();

const readRoles = [
    "owner",
    "manager",
    "cashier",
    "stock_manager"
];

const salesRoles = [
    "owner",
    "manager",
    "cashier"
];

// All routes require authentication and an active business membership.
router.use(authenticate);
router.use(tenantCheck);

// POS product search.
router.get(
    "/:businessId/pos/products",
    authorize(...readRoles),
    salesController.getPosProducts
);

// Complete a sale.
router.post(
    "/:businessId/sales",
    authorize(...salesRoles),
    salesController.createSale
);

// Sales history.
router.get(
    "/:businessId/sales",
    authorize(...readRoles),
    salesController.getSales
);

// Individual sale details.
router.get(
    "/:businessId/sales/:saleId",
    authorize(...readRoles),
    salesController.getSaleById
);

module.exports = router;