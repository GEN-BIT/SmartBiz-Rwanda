const asyncHandler = require("../utils/async-handler");
const purchaseService = require("../services/purchase.service");

const getPurchases = asyncHandler(async (req, res) => {
    const result = await purchaseService.getPurchases(
        req.businessId,
        req.query
    );

    res.status(200).json({
        status: "success",
        message: "Purchases retrieved successfully.",
        data: result.data,
        pagination: result.pagination
    });
});

const getPurchase = asyncHandler(async (req, res) => {
    const result = await purchaseService.getPurchaseById(
        req.businessId,
        req.params.purchaseId
    );

    res.status(200).json({
        status: "success",
        message: "Purchase retrieved successfully.",
        data: result
    });
});

const createPurchase = asyncHandler(async (req, res) => {
    const result = await purchaseService.createPurchase(
        req.businessId,
        req.membership.employee_id,
        req.body
    );

    res.status(201).json({
        status: "success",
        message: "Purchase created successfully. It is awaiting receipt.",
        data: result
    });
});

const receivePurchase = asyncHandler(async (req, res) => {
    const result = await purchaseService.receivePurchase(
        req.businessId,
        req.membership.employee_id,
        req.params.purchaseId
    );

    res.status(200).json({
        status: "success",
        message: "Purchase received and inventory updated successfully.",
        data: result
    });
});

module.exports = {
    getPurchases,
    getPurchase,
    createPurchase,
    receivePurchase
};
