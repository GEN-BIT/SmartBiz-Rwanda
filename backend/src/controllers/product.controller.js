const asyncHandler = require("../utils/async-handler");
const productService = require("../services/product.service");

const getProducts = asyncHandler(async (req, res) => {
    const result = await productService.getProducts(
        req.businessId,
        req.query
    );

    res.status(200).json({
        status: "success",
        message: "Products retrieved successfully.",
        data: result.products,
        pagination: result.pagination
    });
});

const getProduct = asyncHandler(async (req, res) => {
    const product = await productService.getProductById(
        req.businessId,
        req.params.productId
    );

    res.status(200).json({
        status: "success",
        message: "Product retrieved successfully.",
        data: product
    });
});

const createProduct = asyncHandler(async (req, res) => {
    const product = await productService.createProduct(
        req.businessId,
        req.body
    );

    res.status(201).json({
        status: "success",
        message: "Product created successfully.",
        data: product
    });
});

const updateProduct = asyncHandler(async (req, res) => {
    const product = await productService.updateProduct(
        req.businessId,
        req.params.productId,
        req.body
    );

    res.status(200).json({
        status: "success",
        message: "Product updated successfully.",
        data: product
    });
});

const updateProductStatus = asyncHandler(async (req, res) => {
    const product = await productService.setProductStatus(
        req.businessId,
        req.params.productId,
        req.body.status
    );

    res.status(200).json({
        status: "success",
        message: "Product status updated successfully.",
        data: product
    });
});

module.exports = {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    updateProductStatus
};