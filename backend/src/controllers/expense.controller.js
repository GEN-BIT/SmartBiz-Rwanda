/*
 * SmartBiz Rwanda - Expense Controller
 */

const asyncHandler = require("../utils/async-handler");
const expenseService = require("../services/expense.service");

const getExpenses = asyncHandler(async (req, res) => {
    const result = await expenseService.getExpenses(
        req.businessId,
        req.query
    );

    res.status(200).json({
        status: "success",
        message: "Expenses retrieved successfully.",
        data: result.data,
        pagination: result.pagination
    });
});

const getExpense = asyncHandler(async (req, res) => {
    const expense = await expenseService.getExpenseById(
        req.businessId,
        req.params.expenseId
    );

    res.status(200).json({
        status: "success",
        message: "Expense retrieved successfully.",
        data: expense
    });
});

const createExpense = asyncHandler(async (req, res) => {
    const expense = await expenseService.createExpense(
        req.businessId,
        req.membership.employee_id,
        req.body
    );

    res.status(201).json({
        status: "success",
        message: "Expense recorded successfully.",
        data: expense
    });
});

const updateExpense = asyncHandler(async (req, res) => {
    const expense = await expenseService.updateExpense(
        req.businessId,
        req.params.expenseId,
        req.body
    );

    res.status(200).json({
        status: "success",
        message: "Expense updated successfully.",
        data: expense
    });
});

const getExpenseSummary = asyncHandler(async (req, res) => {
    const summary = await expenseService.getExpenseSummary(
        req.businessId,
        req.query
    );

    res.status(200).json({
        status: "success",
        message: "Expense summary retrieved successfully.",
        data: summary
    });
});

module.exports = {
    getExpenses,
    getExpense,
    createExpense,
    updateExpense,
    getExpenseSummary
};
