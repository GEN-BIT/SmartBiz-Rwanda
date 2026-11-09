const express = require("express");

const productController = require("../controllers/product.controller");

const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

const router = express.Router();

const verifyBusiness = [
    authenticate,
    tenantCheck
];

const manageProducts = authorize("owner", "manager", "stock_manager");

// List and search products
router.get(
    "/:businessId/products",
    ...verifyBusiness,
    authorize("owner", "manager", "cashier", "stock_manager"),
    productController.getProducts
);

// Create product
router.post(
    "/:businessId/products",
    ...verifyBusiness,
    manageProducts,
    productController.createProduct
);

// View one product
router.get(
    "/:businessId/products/:productId",
    ...verifyBusiness,
    authorize("owner", "manager", "cashier", "stock_manager"),
    productController.getProduct
);

// Update product
router.put(
    "/:businessId/products/:productId",
    ...verifyBusiness,
    manageProducts,
    productController.updateProduct
);

// Activate or deactivate product
router.patch(
    "/:businessId/products/:productId/status",
    ...verifyBusiness,
    manageProducts,
    productController.updateProductStatus
);

module.exports = router;