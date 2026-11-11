/*
 * SmartBiz Rwanda - Expense Routes
 */

const express = require("express");
const expenseController = require("../controllers/expense.controller");

const authenticate = require("../middleware/authenticate");
const tenantCheck = require("../middleware/tenant-check");
const authorize = require("../middleware/authorize");

const router = express.Router();

const verifyBusiness = [authenticate, tenantCheck];

const viewRoles = authorize("owner", "manager");
const manageRoles = authorize("owner", "manager");

router.get(
    "/:businessId/expenses",
    ...verifyBusiness,
    viewRoles,
    expenseController.getExpenses
);

router.get(
    "/:businessId/expenses/summary",
    ...verifyBusiness,
    viewRoles,
    expenseController.getExpenseSummary
);

router.post(
    "/:businessId/expenses",
    ...verifyBusiness,
    manageRoles,
    expenseController.createExpense
);

router.get(
    "/:businessId/expenses/:expenseId",
    ...verifyBusiness,
    viewRoles,
    expenseController.getExpense
);

router.put(
    "/:businessId/expenses/:expenseId",
    ...verifyBusiness,
    manageRoles,
    expenseController.updateExpense
);

module.exports = router;
