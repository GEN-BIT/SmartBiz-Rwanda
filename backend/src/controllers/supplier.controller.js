const asyncHandler = require("../utils/async-handler");
const supplierService = require("../services/supplier.service");

const getSuppliers = asyncHandler(async (req, res) => {
    const result = await supplierService.getSuppliers(
        req.businessId,
        req.query
    );

    res.status(200).json({
        status: "success",
        message: "Suppliers retrieved successfully.",
        data: result.data,
        pagination: result.pagination
    });
});

const getSupplier = asyncHandler(async (req, res) => {
    const supplier = await supplierService.getSupplierById(
        req.businessId,
        req.params.supplierId
    );

    res.status(200).json({
        status: "success",
        message: "Supplier retrieved successfully.",
        data: supplier
    });
});

const createSupplier = asyncHandler(async (req, res) => {
    const supplier = await supplierService.createSupplier(
        req.businessId,
        req.body
    );

    res.status(201).json({
        status: "success",
        message: "Supplier created successfully.",
        data: supplier
    });
});

const updateSupplier = asyncHandler(async (req, res) => {
    const supplier = await supplierService.updateSupplier(
        req.businessId,
        req.params.supplierId,
        req.body
    );

    res.status(200).json({
        status: "success",
        message: "Supplier updated successfully.",
        data: supplier
    });
});

const updateSupplierStatus = asyncHandler(async (req, res) => {
    const supplier = await supplierService.setSupplierStatus(
        req.businessId,
        req.params.supplierId,
        req.body.status
    );

    res.status(200).json({
        status: "success",
        message: "Supplier status updated successfully.",
        data: supplier
    });
});

const getSupplierPurchases = asyncHandler(async (req, res) => {
    const result = await supplierService.getSupplierPurchases(
        req.businessId,
        req.params.supplierId,
        req.query
    );

    res.status(200).json({
        status: "success",
        message: "Supplier purchases retrieved successfully.",
        data: result.data,
        pagination: result.pagination
    });
});

module.exports = {
    getSuppliers,
    getSupplier,
    createSupplier,
    updateSupplier,
    updateSupplierStatus,
    getSupplierPurchases
};
