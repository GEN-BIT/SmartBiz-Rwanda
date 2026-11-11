const express = require("express");
const supplierController = require("../controllers/supplier.controller");

const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

const router = express.Router();

const verifyBusiness = [authenticate, tenantCheck];
const viewRoles = authorize("owner", "manager", "stock_manager");
const manageRoles = authorize("owner", "manager");

router.get(
    "/:businessId/suppliers",
    ...verifyBusiness,
    viewRoles,
    supplierController.getSuppliers
);

router.post(
    "/:businessId/suppliers",
    ...verifyBusiness,
    manageRoles,
    supplierController.createSupplier
);

router.get(
    "/:businessId/suppliers/:supplierId",
    ...verifyBusiness,
    viewRoles,
    supplierController.getSupplier
);

router.put(
    "/:businessId/suppliers/:supplierId",
    ...verifyBusiness,
    manageRoles,
    supplierController.updateSupplier
);

router.patch(
    "/:businessId/suppliers/:supplierId/status",
    ...verifyBusiness,
    manageRoles,
    supplierController.updateSupplierStatus
);

router.get(
    "/:businessId/suppliers/:supplierId/purchases",
    ...verifyBusiness,
    viewRoles,
    supplierController.getSupplierPurchases
);

module.exports = router;
