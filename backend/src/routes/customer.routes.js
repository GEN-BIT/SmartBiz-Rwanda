/*
 * SmartBiz Rwanda - Customer Routes
 */

const express = require("express");

const customerController = require("../controllers/customer.controller");

const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

const router = express.Router();

const verifyBusiness = [
    authenticate,
    tenantCheck
];

const viewCustomers = authorize(
    "owner",
    "manager",
    "cashier",
    "stock_manager"
);

const manageCustomers = authorize(
    "owner",
    "manager",
    "cashier"
);

// Customer listing
router.get(
    "/:businessId/customers",
    ...verifyBusiness,
    viewCustomers,
    customerController.getCustomers
);

// Customer creation
router.post(
    "/:businessId/customers",
    ...verifyBusiness,
    manageCustomers,
    customerController.createCustomer
);

// Outstanding debts
router.get(
    "/:businessId/debts",
    ...verifyBusiness,
    manageCustomers,
    customerController.getDebts
);

// Record payment against an outstanding sale
router.post(
    "/:businessId/debts/:saleId/payments",
    ...verifyBusiness,
    manageCustomers,
    customerController.recordDebtPayment
);

// Customer details and sales/payment history
router.get(
    "/:businessId/customers/:customerId",
    ...verifyBusiness,
    viewCustomers,
    customerController.getCustomer
);

router.get(
    "/:businessId/customers/:customerId/history",
    ...verifyBusiness,
    viewCustomers,
    customerController.getCustomerHistory
);

// Update customer information
router.put(
    "/:businessId/customers/:customerId",
    ...verifyBusiness,
    manageCustomers,
    customerController.updateCustomer
);

// Activate or deactivate a customer
router.patch(
    "/:businessId/customers/:customerId/status",
    ...verifyBusiness,
    manageCustomers,
    customerController.updateCustomerStatus
);

module.exports = router;