const inventoryService = require("../services/inventory.service");

const inventoryController = {
    async getInventory(req, res, next) {
        try {
            const result = await inventoryService.getInventory(
                req.businessId,
                req.query
            );

            res.status(200).json({
                status: "success",
                ...result
            });
        } catch (error) {
            next(error);
        }
    },

    async getSummary(req, res, next) {
        try {
            const result = await inventoryService.getSummary(req.businessId);

            res.status(200).json({
                status: "success",
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    async getMovements(req, res, next) {
        try {
            const result = await inventoryService.getMovements(
                req.businessId,
                req.query
            );

            res.status(200).json({
                status: "success",
                ...result
            });
        } catch (error) {
            next(error);
        }
    },

    async adjustStock(req, res, next) {
        try {
            const result = await inventoryService.adjustStock(
                req.businessId,
                req.membership.employee_id,
                req.body
            );

            res.status(200).json({
                status: "success",
                message: "Stock adjusted successfully.",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = inventoryController;