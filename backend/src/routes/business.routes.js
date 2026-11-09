const express = require("express");

const businessController = require("../controllers/business.controller");

const inventoryRoutes = require("./inventory.routes");
const salesRoutes = require("./sales.routes");
const customerRoutes = require("./customer.routes");

const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

const router = express.Router();

// Business dashboard
router.get(
    "/:businessId/dashboard",
    authenticate,
    tenantCheck,
    authorize("owner", "manager", "cashier", "stock_manager"),
    businessController.getDashboard
);

router.use(inventoryRoutes);
router.use(salesRoutes);
router.use(customerRoutes);

module.exports = router;