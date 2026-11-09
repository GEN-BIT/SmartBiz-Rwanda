const pool = require("../config/database");
const AppError = require("../utils/AppError");

function parseQuantity(value) {
    const quantity = Number(value);

    if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new AppError("Quantity must be greater than zero.", 400);
    }

    if (Math.round(quantity * 1000) !== quantity * 1000) {
        throw new AppError("Quantity can have a maximum of 3 decimal places.", 400);
    }

    // Work in thousandths to avoid floating-point arithmetic errors.
    return Math.round(quantity * 1000);
}

function formatQuantity(thousandths) {
    return (thousandths / 1000).toFixed(3);
}

const inventoryService = {
    async getInventory(businessId, filters = {}) {
        const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 10));
        const offset = (page - 1) * limit;

        const conditions = ["p.business_id = ?"];
        const params = [businessId];

        if (filters.search) {
            conditions.push("(p.product_name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)");
            const search = `%${filters.search}%`;
            params.push(search, search, search);
        }

        if (filters.category_id) {
            conditions.push("p.category_id = ?");
            params.push(filters.category_id);
        }

        if (filters.status === "active" || filters.status === "inactive") {
            conditions.push("p.status = ?");
            params.push(filters.status);
        }

        if (filters.stock_status === "out") {
            conditions.push("COALESCE(i.quantity, 0) = 0");
        } else if (filters.stock_status === "low") {
            conditions.push("COALESCE(i.quantity, 0) > 0 AND COALESCE(i.quantity, 0) <= p.reorder_level");
        } else if (filters.stock_status === "normal") {
            conditions.push("COALESCE(i.quantity, 0) > p.reorder_level");
        }

        const whereClause = conditions.join(" AND ");

        const [countRows] = await pool.execute(
            `SELECT COUNT(*) AS total
             FROM products p
             LEFT JOIN inventory i
                ON i.business_id = p.business_id
                AND i.product_id = p.product_id
             WHERE ${whereClause}`,
            params
        );

        const [rows] = await pool.execute(
            `SELECT
                p.product_id,
                p.product_name,
                p.sku,
                p.barcode,
                p.unit,
                p.cost_price,
                p.selling_price,
                p.reorder_level,
                p.status AS product_status,
                c.category_name,
                COALESCE(i.quantity, 0.000) AS stock_quantity,
                CASE
                    WHEN COALESCE(i.quantity, 0) = 0 THEN 'out'
                    WHEN COALESCE(i.quantity, 0) <= p.reorder_level THEN 'low'
                    ELSE 'normal'
                END AS stock_status
             FROM products p
             LEFT JOIN categories c
                ON c.business_id = p.business_id
                AND c.category_id = p.category_id
             LEFT JOIN inventory i
                ON i.business_id = p.business_id
                AND i.product_id = p.product_id
             WHERE ${whereClause}
             ORDER BY p.product_name ASC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const total = Number(countRows[0].total);

        return {
            data: rows,
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit)
            }
        };
    },

    async getSummary(businessId) {
        const [rows] = await pool.execute(
            `SELECT
                COUNT(*) AS total_products,
                SUM(CASE WHEN COALESCE(i.quantity, 0) > 0 THEN 1 ELSE 0 END) AS products_in_stock,
                SUM(CASE WHEN COALESCE(i.quantity, 0) = 0 THEN 1 ELSE 0 END) AS out_of_stock,
                SUM(
                    CASE
                        WHEN COALESCE(i.quantity, 0) > 0
                         AND COALESCE(i.quantity, 0) <= p.reorder_level
                        THEN 1 ELSE 0
                    END
                ) AS low_stock
             FROM products p
             LEFT JOIN inventory i
                ON i.business_id = p.business_id
                AND i.product_id = p.product_id
             WHERE p.business_id = ?
               AND p.status = 'active'`,
            [businessId]
        );

        const summary = rows[0];

        return {
            total_products: Number(summary.total_products || 0),
            products_in_stock: Number(summary.products_in_stock || 0),
            low_stock: Number(summary.low_stock || 0),
            out_of_stock: Number(summary.out_of_stock || 0)
        };
    },

    async getMovements(businessId, filters = {}) {
        const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 10));
        const offset = (page - 1) * limit;

        const conditions = ["sm.business_id = ?"];
        const params = [businessId];

        if (filters.product_id) {
            conditions.push("sm.product_id = ?");
            params.push(filters.product_id);
        }

        if (filters.movement_type) {
            conditions.push("sm.movement_type = ?");
            params.push(filters.movement_type);
        }

        const whereClause = conditions.join(" AND ");

        const [countRows] = await pool.execute(
            `SELECT COUNT(*) AS total
             FROM stock_movements sm
             WHERE ${whereClause}`,
            params
        );

        const [rows] = await pool.execute(
            `SELECT
                sm.movement_id,
                sm.product_id,
                p.product_name,
                p.sku,
                sm.employee_id,
                e.role AS employee_role,
                sm.movement_type,
                sm.quantity,
                sm.reference_type,
                sm.reference_id,
                sm.notes,
                sm.created_at
             FROM stock_movements sm
             INNER JOIN products p
                ON p.business_id = sm.business_id
                AND p.product_id = sm.product_id
             LEFT JOIN employees e
                ON e.business_id = sm.business_id
                AND e.employee_id = sm.employee_id
             WHERE ${whereClause}
             ORDER BY sm.created_at DESC, sm.movement_id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const total = Number(countRows[0].total);

        return {
            data: rows,
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit)
            }
        };
    },

    async adjustStock(businessId, employeeId, data) {
        const productId = Number(data.product_id);

        if (!Number.isSafeInteger(productId) || productId <= 0) {
            throw new AppError("A valid product is required.", 400);
        }

        const quantity = parseQuantity(data.quantity);
        const adjustmentType = data.adjustment_type;

        const allowedTypes = ["increase", "decrease", "damage", "expired"];

        if (!allowedTypes.includes(adjustmentType)) {
            throw new AppError("Invalid stock adjustment type.", 400);
        }

        const notes = typeof data.notes === "string" ? data.notes.trim() : "";

        if (notes.length > 255) {
            throw new AppError("Notes cannot exceed 255 characters.", 400);
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Confirm that the product belongs to this business.
            const [products] = await connection.execute(
                `SELECT product_id
                 FROM products
                 WHERE business_id = ?
                   AND product_id = ?
                   AND status = 'active'
                 FOR UPDATE`,
                [businessId, productId]
            );

            if (!products.length) {
                throw new AppError("Product not found or inactive.", 404);
            }

            // Create an inventory row if this product has no stock record yet.
            await connection.execute(
                `INSERT INTO inventory (business_id, product_id, quantity)
                 VALUES (?, ?, 0.000)
                 ON DUPLICATE KEY UPDATE product_id = VALUES(product_id)`,
                [businessId, productId]
            );

            const [inventoryRows] = await connection.execute(
                `SELECT quantity
                 FROM inventory
                 WHERE business_id = ?
                   AND product_id = ?
                 FOR UPDATE`,
                [businessId, productId]
            );

            const currentQuantity = Math.round(Number(inventoryRows[0].quantity) * 1000);

            const reducesStock = ["decrease", "damage", "expired"].includes(adjustmentType);

            if (reducesStock && quantity > currentQuantity) {
                throw new AppError("The adjustment exceeds the available stock.", 400);
            }

            const newQuantity = reducesStock
                ? currentQuantity - quantity
                : currentQuantity + quantity;

            await connection.execute(
                `UPDATE inventory
                 SET quantity = ?
                 WHERE business_id = ?
                   AND product_id = ?`,
                [formatQuantity(newQuantity), businessId, productId]
            );

            const referenceType = adjustmentType === "increase" || adjustmentType === "decrease"
                ? adjustmentType
                : adjustmentType;

            await connection.execute(
                `INSERT INTO stock_movements
                    (business_id, product_id, employee_id, movement_type,
                     quantity, reference_type, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    businessId,
                    productId,
                    employeeId || null,
                    adjustmentType === "damage" || adjustmentType === "expired"
                        ? adjustmentType
                        : "adjustment",
                    formatQuantity(quantity),
                    referenceType,
                    notes || null
                ]
            );

            await connection.commit();

            return {
                product_id: productId,
                previous_quantity: formatQuantity(currentQuantity),
                adjustment_quantity: formatQuantity(quantity),
                new_quantity: formatQuantity(newQuantity),
                adjustment_type: adjustmentType
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = inventoryService;