const express = require("express");

const categoryController = require("../controllers/category.controller");

const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

const router = express.Router();

const verifyBusiness = [
    authenticate,
    tenantCheck
];

const manageCategories = authorize("owner", "manager", "stock_manager");

router.get(
    "/:businessId/categories",
    ...verifyBusiness,
    authorize("owner", "manager", "cashier", "stock_manager"),
    categoryController.getCategories
);

router.post(
    "/:businessId/categories",
    ...verifyBusiness,
    manageCategories,
    categoryController.createCategory
);

router.get(
    "/:businessId/categories/:categoryId",
    ...verifyBusiness,
    authorize("owner", "manager", "cashier", "stock_manager"),
    categoryController.getCategory
);

router.put(
    "/:businessId/categories/:categoryId",
    ...verifyBusiness,
    manageCategories,
    categoryController.updateCategory
);

router.patch(
    "/:businessId/categories/:categoryId/status",
    ...verifyBusiness,
    manageCategories,
    categoryController.updateCategoryStatus
);

module.exports = router;