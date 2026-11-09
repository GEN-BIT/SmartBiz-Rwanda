/*
 * SmartBiz Rwanda - Customer Controller
 */

const asyncHandler = require("../utils/async-handler");
const customerService = require("../services/customer.service");

const getCustomers = asyncHandler(async (req, res) => {
    const result = await customerService.getCustomers(
        req.businessId,
        req.query
    );

    res.status(200).json({
        status: "success",
        message: "Customers retrieved successfully.",
        data: result.data,
        pagination: result.pagination
    });
});

const getCustomer = asyncHandler(async (req, res) => {
    const customer = await customerService.getCustomerById(
        req.businessId,
        req.params.customerId
    );

    res.status(200).json({
        status: "success",
        message: "Customer retrieved successfully.",
        data: customer
    });
});

const createCustomer = asyncHandler(async (req, res) => {
    const customer = await customerService.createCustomer(
        req.businessId,
        req.body
    );

    res.status(201).json({
        status: "success",
        message: "Customer created successfully.",
        data: customer
    });
});

const updateCustomer = asyncHandler(async (req, res) => {
    const customer = await customerService.updateCustomer(
        req.businessId,
        req.params.customerId,
        req.body
    );

    res.status(200).json({
        status: "success",
        message: "Customer updated successfully.",
        data: customer
    });
});

const updateCustomerStatus = asyncHandler(async (req, res) => {
    const customer = await customerService.setCustomerStatus(
        req.businessId,
        req.params.customerId,
        req.body.status
    );

    res.status(200).json({
        status: "success",
        message: "Customer status updated successfully.",
        data: customer
    });
});

const getCustomerHistory = asyncHandler(async (req, res) => {
    const result = await customerService.getCustomerHistory(
        req.businessId,
        req.params.customerId
    );

    res.status(200).json({
        status: "success",
        message: "Customer history retrieved successfully.",
        data: result
    });
});

const getDebts = asyncHandler(async (req, res) => {
    const result = await customerService.getDebts(
        req.businessId,
        req.query
    );

    res.status(200).json({
        status: "success",
        message: "Outstanding debts retrieved successfully.",
        data: result.data,
        pagination: result.pagination
    });
});

const recordDebtPayment = asyncHandler(async (req, res) => {
    const result = await customerService.recordDebtPayment(
        req.businessId,
        req.membership.employee_id,
        req.params.saleId,
        req.body
    );

    res.status(201).json({
        status: "success",
        message: "Debt payment recorded successfully.",
        data: result
    });
});

module.exports = {
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    updateCustomerStatus,
    getCustomerHistory,
    getDebts,
    recordDebtPayment
};