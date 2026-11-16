
/*
 * SmartBiz Rwanda - Cash Register Controller
 */

const cashRegisterService = require("../services/cash-register.service");

/**
 * Open a new cash register for the authenticated employee.
 * POST /api/v1/businesses/:businessId/cash-register/open
 */
const openRegister = async (req, res, next) => {
    try {
        const register = await cashRegisterService.openRegister(
            req.businessId,
            req.membership.employee_id,
            req.body
        );

        res.status(201).json({
            success: true,
            message: "Cash register opened successfully.",
            data: register
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get the authenticated employee's currently open register.
 * GET /api/v1/businesses/:businessId/cash-register/current
 */
const getCurrentRegister = async (req, res, next) => {
    try {
        const register = await cashRegisterService.getCurrentRegister(
            req.businessId,
            req.membership.employee_id
        );

        res.status(200).json({
            success: true,
            message: register
                ? "Current cash register retrieved successfully."
                : "No open cash register was found.",
            data: register
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get a specific cash register.
 * GET /api/v1/businesses/:businessId/cash-register/:registerId
 */
const getRegisterById = async (req, res, next) => {
    try {
        const register = await cashRegisterService.getRegisterById(
            req.businessId,
            req.params.registerId,
            req.membership.employee_id,
            req.membership.role
        );

        res.status(200).json({
            success: true,
            message: "Cash register retrieved successfully.",
            data: register
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get cash register history.
 * GET /api/v1/businesses/:businessId/cash-register/history
 */
const getRegisterHistory = async (req, res, next) => {
    try {
        const result = await cashRegisterService.getRegisterHistory(
            req.businessId,
            req.membership.employee_id,
            req.membership.role,
            req.query
        );

        res.status(200).json({
            success: true,
            message: "Cash register history retrieved successfully.",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Close an open cash register.
 * POST /api/v1/businesses/:businessId/cash-register/:registerId/close
 */
const closeRegister = async (req, res, next) => {
    try {
        const register = await cashRegisterService.closeRegister(
            req.businessId,
            req.params.registerId,
            req.membership.employee_id,
            req.membership.role,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Cash register closed successfully.",
            data: register
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    openRegister,
    getCurrentRegister,
    getRegisterById,
    getRegisterHistory,
    closeRegister
};
