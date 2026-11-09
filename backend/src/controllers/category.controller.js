const asyncHandler = require("../utils/async-handler");
const categoryService = require("../services/category.service");

const getCategories = asyncHandler(async (req, res) => {
    const categories = await categoryService.getCategories(req.businessId);

    res.status(200).json({
        status: "success",
        message: "Categories retrieved successfully.",
        data: categories
    });
});

const getCategory = asyncHandler(async (req, res) => {
    const category = await categoryService.getCategoryById(
        req.businessId,
        req.params.categoryId
    );

    res.status(200).json({
        status: "success",
        message: "Category retrieved successfully.",
        data: category
    });
});

const createCategory = asyncHandler(async (req, res) => {
    const category = await categoryService.createCategory(
        req.businessId,
        req.body
    );

    res.status(201).json({
        status: "success",
        message: "Category created successfully.",
        data: category
    });
});

const updateCategory = asyncHandler(async (req, res) => {
    const category = await categoryService.updateCategory(
        req.businessId,
        req.params.categoryId,
        req.body
    );

    res.status(200).json({
        status: "success",
        message: "Category updated successfully.",
        data: category
    });
});

const updateCategoryStatus = asyncHandler(async (req, res) => {
    const category = await categoryService.setCategoryStatus(
        req.businessId,
        req.params.categoryId,
        req.body.status
    );

    res.status(200).json({
        status: "success",
        message: "Category status updated successfully.",
        data: category
    });
});

module.exports = {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    updateCategoryStatus
};