/*
 * SmartBiz Rwanda - Sales Controller
 */

const salesService = require("../services/sales.service");
const AppError = require("../utils/AppError");

function parseSaleId(value) {
    const saleId = Number(value);

    if (!Number.isSafeInteger(saleId) || saleId <= 0) {
        throw new AppError("Invalid sale ID.", 400);
    }

    return saleId;
}

async function getPosProducts(req, res, next) {
    try {
        const products = await salesService.getPosProducts(
            req.businessId,
            req.query
        );

        res.status(200).json({
            status: "success",
            data: products
        });
    } catch (error) {
        next(error);
    }
}

async function createSale(req, res, next) {
    try {
        const result = await salesService.createSale(
            req.businessId,
            req.membership.employee_id,
            req.body
        );

        res.status(201).json({
            status: "success",
            message: "Sale completed successfully.",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

async function getSales(req, res, next) {
    try {
        const result = await salesService.getSales(
            req.businessId,
            req.query
        );

        res.status(200).json({
            status: "success",
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
}

async function getSaleById(req, res, next) {
    try {
        const saleId = parseSaleId(req.params.saleId);

        const result = await salesService.getSaleById(
            req.businessId,
            saleId
        );

        res.status(200).json({
            status: "success",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getPosProducts,
    createSale,
    getSales,
    getSaleById
};