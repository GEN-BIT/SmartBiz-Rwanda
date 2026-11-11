const pool = require("../config/database");
const AppError = require("../utils/AppError");
const crypto = require("crypto");

function parseId(value, field = "ID") {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new AppError(`${field} is invalid.`, 400);
    }
    return id;
}

function toCents(value, field) {
    const text = String(value ?? "");
    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
        throw new AppError(`${field} must have up to 2 decimal places.`, 400);
    }
    const [whole, decimal = ""] = text.split(".");
    const result = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
    if (!Number.isSafeInteger(result)) {
        throw new AppError(`${field} is too large.`, 400);
    }
    return result;
}

function money(cents) {
    return (cents / 100).toFixed(2);
}

function toMilli(value) {
    const text = String(value ?? "");
    if (!/^\d+(\.\d{1,3})?$/.test(text)) {
        throw new AppError("Quantity must have up to 3 decimal places.", 400);
    }
    const [whole, decimal = ""] = text.split(".");
    const result = Number(whole) * 1000 + Number(decimal.padEnd(3, "0"));
    if (!Number.isSafeInteger(result) || result <= 0) {
        throw new AppError("Quantity must be greater than zero.", 400);
    }
    return result;
}

function quantity(milli) {
    return (milli / 1000).toFixed(3);
}

function stockMilli(value) {
    const text = String(value ?? "0");
    if (!/^\d+(\.\d{1,3})?$/.test(text)) {
        throw new AppError("Invalid inventory quantity.", 500);
    }
    const [whole, decimal = ""] = text.split(".");
    return Number(whole) * 1000 + Number(decimal.padEnd(3, "0"));
}

function purchaseNumber() {
    const date = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `PUR-${date}-${random}`;
}

function pagination(filters) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    return { page, limit, offset: (page - 1) * limit };
}

async function getPurchases(businessId, filters = {}) {
    const { page, limit, offset } = pagination(filters);
    const conditions = ["p.business_id = ?"];
    const params = [businessId];

    if (filters.search) {
        conditions.push("(p.purchase_number LIKE ? OR s.supplier_name LIKE ?)");
        const search = `%${filters.search}%`;
        params.push(search, search);
    }

    if (filters.purchase_status) {
        if (!["pending", "received", "cancelled"].includes(filters.purchase_status)) {
            throw new AppError("Invalid purchase status.", 400);
        }
        conditions.push("p.purchase_status = ?");
        params.push(filters.purchase_status);
    }

    if (filters.payment_status) {
        if (!["unpaid", "partial", "paid"].includes(filters.payment_status)) {
            throw new AppError("Invalid payment status.", 400);
        }
        conditions.push("p.payment_status = ?");
        params.push(filters.payment_status);
    }

    const where = conditions.join(" AND ");

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM purchases p
         INNER JOIN suppliers s
            ON s.business_id = p.business_id
           AND s.supplier_id = p.supplier_id
         WHERE ${where}`,
        params
    );

    const [rows] = await pool.execute(
        `SELECT
            p.purchase_id,
            p.purchase_number,
            p.supplier_id,
            s.supplier_name,
            p.subtotal,
            p.tax_amount,
            p.total_amount,
            p.amount_paid,
            p.balance_due,
            p.payment_status,
            p.purchase_status,
            p.created_at
         FROM purchases p
         INNER JOIN suppliers s
            ON s.business_id = p.business_id
           AND s.supplier_id = p.supplier_id
         WHERE ${where}
         ORDER BY p.created_at DESC
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
}

async function getPurchaseById(businessId, purchaseId) {
    parseId(purchaseId, "Purchase ID");

    const [rows] = await pool.execute(
        `SELECT
            p.*,
            s.supplier_name,
            s.contact_person,
            s.phone AS supplier_phone,
            s.email AS supplier_email,
            e.employee_id
         FROM purchases p
         INNER JOIN suppliers s
            ON s.business_id = p.business_id
           AND s.supplier_id = p.supplier_id
         INNER JOIN employees e
            ON e.business_id = p.business_id
           AND e.employee_id = p.employee_id
         WHERE p.business_id = ? AND p.purchase_id = ?
         LIMIT 1`,
        [businessId, purchaseId]
    );

    if (!rows.length) {
        throw new AppError("Purchase not found.", 404);
    }

    const [items] = await pool.execute(
        `SELECT
            pi.purchase_item_id,
            pi.product_id,
            pr.product_name,
            pr.sku,
            pr.unit,
            pi.quantity,
            pi.unit_cost,
            pi.subtotal
         FROM purchase_items pi
         INNER JOIN products pr
            ON pr.business_id = pi.business_id
           AND pr.product_id = pi.product_id
         WHERE pi.business_id = ? AND pi.purchase_id = ?
         ORDER BY pi.purchase_item_id ASC`,
        [businessId, purchaseId]
    );

    return { purchase: rows[0], items };
}

async function createPurchase(businessId, employeeId, data) {
    const supplierId = parseId(data.supplier_id, "Supplier ID");
    const taxCents = toCents(data.tax_amount ?? "0", "Tax");

    if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new AppError("Add at least one product to the purchase.", 400);
    }
    if (data.items.length > 100) {
        throw new AppError("A purchase cannot contain more than 100 items.", 400);
    }

    const requested = new Map();

    for (const item of data.items) {
        const productId = parseId(item.product_id, "Product ID");
        if (requested.has(productId)) {
            throw new AppError("Each product should appear only once.", 400);
        }
        requested.set(productId, {
            quantityMilli: toMilli(item.quantity),
            unitCostCents: toCents(item.unit_cost, "Unit cost")
        });
    }

    let subtotalCents = 0;
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        await connection.beginTransaction();
        transactionStarted = true;

        const [suppliers] = await connection.execute(
            `SELECT supplier_id
             FROM suppliers
             WHERE business_id = ? AND supplier_id = ? AND status = 'active'
             FOR UPDATE`,
            [businessId, supplierId]
        );
        if (!suppliers.length) {
            throw new AppError("Active supplier not found in this business.", 404);
        }

        const productIds = [...requested.keys()];
        const placeholders = productIds.map(() => "?").join(",");

        const [products] = await connection.execute(
            `SELECT product_id, product_name, status
             FROM products
             WHERE business_id = ? AND product_id IN (${placeholders})
             FOR UPDATE`,
            [businessId, ...productIds]
        );

        if (products.length !== productIds.length) {
            throw new AppError("One or more products were not found.", 404);
        }

        const productMap = new Map(products.map(p => [Number(p.product_id), p]));
        const items = [];

        for (const [productId, values] of requested) {
            const product = productMap.get(productId);
            if (product.status !== "active") {
                throw new AppError(`${product.product_name} is inactive.`, 400);
            }

            const lineCents = Math.round(
                values.quantityMilli * values.unitCostCents / 1000
            );
            subtotalCents += lineCents;

            items.push({
                productId,
                quantityMilli: values.quantityMilli,
                unitCostCents: values.unitCostCents,
                subtotalCents: lineCents
            });
        }

        const totalCents = subtotalCents + taxCents;
        const amountPaidCents = toCents(data.amount_paid ?? "0", "Amount paid");

        if (amountPaidCents > totalCents) {
            throw new AppError("Amount paid cannot exceed the purchase total.", 400);
        }

        const balanceCents = totalCents - amountPaidCents;
        const paymentStatus = balanceCents === 0
            ? "paid"
            : amountPaidCents === 0
                ? "unpaid"
                : "partial";

        const number = purchaseNumber();

        const [result] = await connection.execute(
            `INSERT INTO purchases (
                business_id, supplier_id, employee_id, purchase_number,
                subtotal, tax_amount, total_amount, amount_paid, balance_due,
                payment_status, purchase_status, notes
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [
                businessId,
                supplierId,
                employeeId,
                number,
                money(subtotalCents),
                money(taxCents),
                money(totalCents),
                money(amountPaidCents),
                money(balanceCents),
                paymentStatus,
                data.notes ? String(data.notes).slice(0, 255) : null
            ]
        );

        const purchaseId = result.insertId;

        for (const item of items) {
            await connection.execute(
                `INSERT INTO purchase_items (
                    business_id, purchase_id, product_id,
                    quantity, unit_cost, subtotal
                 ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    businessId,
                    purchaseId,
                    item.productId,
                    quantity(item.quantityMilli),
                    money(item.unitCostCents),
                    money(item.subtotalCents)
                ]
            );
        }

        await connection.commit();

        return {
            purchase_id: purchaseId,
            purchase_number: number,
            subtotal: money(subtotalCents),
            tax_amount: money(taxCents),
            total_amount: money(totalCents),
            amount_paid: money(amountPaidCents),
            balance_due: money(balanceCents),
            payment_status: paymentStatus,
            purchase_status: "pending"
        };
    } catch (error) {
        if (transactionStarted) await connection.rollback();
        if (error.code === "ER_DUP_ENTRY") {
            throw new AppError("Purchase number conflict. Please try again.", 409);
        }
        throw error;
    } finally {
        connection.release();
    }
}

async function receivePurchase(businessId, employeeId, purchaseId) {
    parseId(purchaseId, "Purchase ID");

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        await connection.beginTransaction();
        transactionStarted = true;

        const [purchases] = await connection.execute(
            `SELECT purchase_id, purchase_number, purchase_status
             FROM purchases
             WHERE business_id = ? AND purchase_id = ?
             FOR UPDATE`,
            [businessId, purchaseId]
        );

        if (!purchases.length) {
            throw new AppError("Purchase not found.", 404);
        }

        const purchase = purchases[0];

        if (purchase.purchase_status !== "pending") {
            throw new AppError(
                "Only pending purchases can be received. This purchase may already have been processed.",
                409
            );
        }

        const [items] = await connection.execute(
            `SELECT product_id, quantity
             FROM purchase_items
             WHERE business_id = ? AND purchase_id = ?
             ORDER BY product_id ASC`,
            [businessId, purchaseId]
        );

        if (!items.length) {
            throw new AppError("This purchase has no items.", 409);
        }

        for (const item of items) {
            const receivedMilli = stockMilli(item.quantity);

            await connection.execute(
                `INSERT INTO inventory (business_id, product_id, quantity)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    quantity = quantity + VALUES(quantity)`,
                [businessId, item.product_id, quantity(receivedMilli)]
            );

            await connection.execute(
                `INSERT INTO stock_movements (
                    business_id, product_id, employee_id, movement_type,
                    quantity, reference_type, reference_id, notes
                 ) VALUES (?, ?, ?, 'purchase', ?, 'purchase', ?, ?)`,
                [
                    businessId,
                    item.product_id,
                    employeeId,
                    quantity(receivedMilli),
                    purchaseId,
                    `Received purchase ${purchase.purchase_number}`
                ]
            );
        }

        await connection.execute(
            `UPDATE purchases
             SET purchase_status = 'received'
             WHERE business_id = ? AND purchase_id = ?`,
            [businessId, purchaseId]
        );

        await connection.commit();

        return {
            purchase_id: Number(purchaseId),
            purchase_number: purchase.purchase_number,
            purchase_status: "received",
            received_items: items.length
        };
    } catch (error) {
        if (transactionStarted) await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    getPurchases,
    getPurchaseById,
    createPurchase,
    receivePurchase
};
