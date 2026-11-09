const pool = require("../config/database");
const AppError = require("../utils/AppError");

async function tenantCheck(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError("Authentication required.", 401);
        }

        // Business ID must come from the URL, not the request body.
        const businessId = req.params.businessId;

        if (!businessId) {
            throw new AppError("Business ID is required in the URL.", 400);
        }

        const [rows] = await pool.execute(
            `SELECT
                e.employee_id,
                e.business_id,
                e.user_id,
                e.role,
                e.status AS membership_status,
                b.business_name,
                b.status AS business_status
             FROM employees e
             INNER JOIN businesses b
                ON b.business_id = e.business_id
             INNER JOIN users u
                ON u.user_id = e.user_id
             WHERE e.business_id = ?
               AND e.user_id = ?
               AND e.status = 'active'
               AND u.status = 'active'
               AND b.status = 'active'
             LIMIT 1`,
            [businessId, req.user.userId]
        );

        if (rows.length === 0) {
            throw new AppError(
                "You do not have access to this active business.",
                403
            );
        }

        req.businessId = String(rows[0].business_id);
        req.membership = rows[0];

        next();

    } catch (error) {
        next(error);
    }
}

module.exports = tenantCheck;