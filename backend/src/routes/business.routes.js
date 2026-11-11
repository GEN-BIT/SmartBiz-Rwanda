const express = require("express");

const businessController = require("../controllers/business.controller");

const inventoryRoutes = require("./inventory.routes");
const salesRoutes = require("./sales.routes");
const customerRoutes = require("./customer.routes");
const supplierRoutes = require("./supplier.routes");
const purchaseRoutes = require("./purchase.routes");
const expenseRoutes = require("./expense.routes");

const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

const router = express.Router();

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
router.use(supplierRoutes);
router.use(purchaseRoutes);
router.use(expenseRoutes);

module.exports = router;

