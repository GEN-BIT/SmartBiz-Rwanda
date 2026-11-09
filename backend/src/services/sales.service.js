/*
 * SmartBiz Rwanda - Sales Service
 * Handles POS checkout, sales history and sale details.
 */

const pool = require("../config/database");
const AppError = require("../utils/AppError");
const crypto = require("crypto");

const PAYMENT_METHODS = [
    "cash",
    "mobile_money",
    "bank_transfer",
    "card",
    "credit",
    "other"
];

function parseId(value, fieldName) {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} is invalid.`, 400);
    }

    return id;
}

// Convert money into integer cents to avoid floating-point calculations.
function toCents(value, fieldName) {
    const text = String(value ?? "0");

    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
        throw new AppError(`${fieldName} must be a valid amount with up to 2 decimal places.`, 400);
    }

    const [whole, decimal = ""] = text.split(".");
    return Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
}

function fromCents(value) {
    return (value / 100).toFixed(2);
}

function toMilliUnits(value, fieldName) {
    const text = String(value ?? "");

    if (!/^\d+(\.\d{1,3})?$/.test(text)) {
        throw new AppError(`${fieldName} must be a valid quantity with up to 3 decimal places.`, 400);
    }

    const [whole, decimal = ""] = text.split(".");
    const quantity = Number(whole) * 1000 +
        Number(decimal.padEnd(3, "0"));

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        throw new AppError(`${fieldName} must be greater than zero.`, 400);
    }

    return quantity;
}

function toStockMilli(value) {
    const text = String(value ?? "0");

    if (!/^\d+(\.\d{1,3})?$/.test(text)) {
        throw new AppError("Invalid inventory quantity.", 500);
    }

    const [whole, decimal = ""] = text.split(".");
    return Number(whole) * 1000 +
        Number(decimal.padEnd(3, "0"));
}

function fromMilliUnits(value) {
    return (value / 1000).toFixed(3);
}

function calculateLineTotal(quantityMilli, unitPriceCents) {
    return Math.round((quantityMilli * unitPriceCents) / 1000);
}

function createInvoiceNumber() {
    const date = new Date();
    const datePart = date.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();

    return `SB-${datePart}-${randomPart}`;
}

function getPagination(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

    return {
        page,
        limit,
        offset: (page - 1) * limit
    };
}

/*
 * Get active products for the POS.
 */
async function getPosProducts(businessId, filters = {}) {
    const conditions = [
        "p.business_id = ?",
        "p.status = 'active'"
    ];

    const params = [businessId];

    if (filters.search) {
        conditions.push(
            "(p.product_name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)"
        );

        const search = `%${filters.search}%`;
        params.push(search, search, search);
    }

    const [rows] = await pool.execute(
        `SELECT
            p.product_id,
            p.product_name,
            p.sku,
            p.barcode,
            p.selling_price,
            p.unit,
            COALESCE(i.quantity, 0.000) AS stock_quantity
         FROM products p
         LEFT JOIN inventory i
            ON i.business_id = p.business_id
            AND i.product_id = p.product_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY p.product_name ASC
         LIMIT 100`,
        params
    );

    return rows;
}

/*
 * Complete a POS sale.
 * Sale, sale items, payment, inventory and stock movements
 * are committed together or rolled back together.
 */
async function createSale(businessId, employeeId, data) {
    const connection = await pool.getConnection();

    try {
        const customerId = data.customer_id
            ? parseId(data.customer_id, "Customer ID")
            : null;

        if (!Array.isArray(data.items) || data.items.length === 0) {
            throw new AppError("Add at least one product to the sale.", 400);
        }

        if (data.items.length > 100) {
            throw new AppError("A sale cannot contain more than 100 items.", 400);
        }

        const discountCents = toCents(
            data.discount_amount ?? "0",
            "Discount"
        );

        const taxCents = toCents(
            data.tax_amount ?? "0",
            "Tax"
        );

        const paymentMethod = data.payment_method || "cash";

        if (!PAYMENT_METHODS.includes(paymentMethod)) {
            throw new AppError("Invalid payment method.", 400);
        }

        const requestedItems = new Map();

        for (const item of data.items) {
            const productId = parseId(item.product_id, "Product ID");
            const quantityMilli = toMilliUnits(item.quantity, "Quantity");

            if (requestedItems.has(productId)) {
                throw new AppError(
                    "Each product should appear only once in the cart.",
                    400
                );
            }

            requestedItems.set(productId, quantityMilli);
        }

        await connection.beginTransaction();

        // Confirm the customer belongs to this business.
        if (customerId) {
            const [customers] = await connection.execute(
                `SELECT customer_id
                 FROM customers
                 WHERE business_id = ? AND customer_id = ?
                 LIMIT 1`,
                [businessId, customerId]
            );

            if (!customers.length) {
                throw new AppError("Customer not found in this business.", 404);
            }
        }

        const productIds = [...requestedItems.keys()];
        const placeholders = productIds.map(() => "?").join(",");

        // Lock products so their prices and status cannot change mid-checkout.
        const [products] = await connection.execute(
            `SELECT
                product_id,
                product_name,
                selling_price,
                cost_price,
                status
             FROM products
             WHERE business_id = ?
               AND product_id IN (${placeholders})
             FOR UPDATE`,
            [businessId, ...productIds]
        );

        if (products.length !== productIds.length) {
            throw new AppError("One or more products were not found.", 404);
        }

        const productMap = new Map(
            products.map(product => [Number(product.product_id), product])
        );

        const saleItems = [];
        let subtotalCents = 0;

        for (const [productId, quantityMilli] of requestedItems) {
            const product = productMap.get(productId);

            if (product.status !== "active") {
                throw new AppError(
                    `${product.product_name} is not available for sale.`,
                    400
                );
            }

            const unitPriceCents = toCents(
                product.selling_price,
                "Product selling price"
            );

            const unitCostCents = toCents(
                product.cost_price,
                "Product cost price"
            );

            const lineTotalCents = calculateLineTotal(
                quantityMilli,
                unitPriceCents
            );

            subtotalCents += lineTotalCents;

            saleItems.push({
                productId,
                productName: product.product_name,
                quantityMilli,
                unitPriceCents,
                unitCostCents,
                lineTotalCents
            });
        }

        if (discountCents > subtotalCents) {
            throw new AppError("Discount cannot exceed the sale subtotal.", 400);
        }

        const totalCents = subtotalCents - discountCents + taxCents;

        if (totalCents <= 0) {
            throw new AppError("The sale total must be greater than zero.", 400);
        }

        const amountPaidCents = toCents(
            data.amount_paid ?? fromCents(totalCents),
            "Amount paid"
        );

        if (amountPaidCents > totalCents) {
            throw new AppError("Amount paid cannot exceed the sale total.", 400);
        }

        if (paymentMethod === "credit" && amountPaidCents !== 0) {
            throw new AppError(
                "Use another payment method when recording an amount paid.",
                400
            );
        }

        const balanceDueCents = totalCents - amountPaidCents;

        if (balanceDueCents > 0 && !customerId) {
            throw new AppError(
                "Select a customer when recording an unpaid or partially paid sale.",
                400
            );
        }

        // Lock inventory rows and check available quantities.
        for (const item of saleItems) {
            const [inventoryRows] = await connection.execute(
                `SELECT quantity
                 FROM inventory
                 WHERE business_id = ? AND product_id = ?
                 FOR UPDATE`,
                [businessId, item.productId]
            );

            const availableMilli = inventoryRows.length
                ? toStockMilli(inventoryRows[0].quantity)
                : 0;

            if (availableMilli < item.quantityMilli) {
                throw new AppError(
                    `Insufficient stock for ${item.productName}. Available: ${fromMilliUnits(availableMilli)}.`,
                    400
                );
            }
        }

        const invoiceNumber = createInvoiceNumber();

        const paymentStatus = balanceDueCents === 0
            ? "paid"
            : amountPaidCents === 0
                ? "unpaid"
                : "partial";

        const [saleResult] = await connection.execute(
            `INSERT INTO sales (
                business_id,
                customer_id,
                employee_id,
                invoice_number,
                subtotal,
                discount_amount,
                tax_amount,
                total_amount,
                amount_paid,
                balance_due,
                payment_status,
                sale_status,
                notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
            [
                businessId,
                customerId,
                employeeId,
                invoiceNumber,
                fromCents(subtotalCents),
                fromCents(discountCents),
                fromCents(taxCents),
                fromCents(totalCents),
                fromCents(amountPaidCents),
                fromCents(balanceDueCents),
                paymentStatus,
                data.notes || null
            ]
        );

        const saleId = saleResult.insertId;

        for (const item of saleItems) {
            await connection.execute(
                `INSERT INTO sale_items (
                    business_id,
                    sale_id,
                    product_id,
                    quantity,
                    unit_price,
                    unit_cost,
                    discount_amount,
                    subtotal
                ) VALUES (?, ?, ?, ?, ?, ?, 0.00, ?)`,
                [
                    businessId,
                    saleId,
                    item.productId,
                    fromMilliUnits(item.quantityMilli),
                    fromCents(item.unitPriceCents),
                    fromCents(item.unitCostCents),
                    fromCents(item.lineTotalCents)
                ]
            );

            await connection.execute(
                `UPDATE inventory
                 SET quantity = quantity - ?
                 WHERE business_id = ? AND product_id = ?`,
                [
                    fromMilliUnits(item.quantityMilli),
                    businessId,
                    item.productId
                ]
            );

            await connection.execute(
                `INSERT INTO stock_movements (
                    business_id,
                    product_id,
                    employee_id,
                    movement_type,
                    quantity,
                    reference_type,
                    reference_id,
                    notes
                ) VALUES (?, ?, ?, 'sale', ?, 'sale', ?, ?)`,
                [
                    businessId,
                    item.productId,
                    employeeId,
                    fromMilliUnits(item.quantityMilli),
                    saleId,
                    `Stock deducted for invoice ${invoiceNumber}`
                ]
            );
        }

        // Only actual money received creates a payment record.
        if (amountPaidCents > 0) {
            await connection.execute(
                `INSERT INTO payments (
                    business_id,
                    sale_id,
                    customer_id,
                    employee_id,
                    amount,
                    payment_method,
                    payment_type,
                    notes
                ) VALUES (?, ?, ?, ?, ?, ?, 'sale_payment', ?)`,
                [
                    businessId,
                    saleId,
                    customerId,
                    employeeId,
                    fromCents(amountPaidCents),
                    paymentMethod,
                    `Payment for invoice ${invoiceNumber}`
                ]
            );
        }

        await connection.commit();

        return {
            sale_id: saleId,
            invoice_number: invoiceNumber,
            subtotal: fromCents(subtotalCents),
            discount_amount: fromCents(discountCents),
            tax_amount: fromCents(taxCents),
            total_amount: fromCents(totalCents),
            amount_paid: fromCents(amountPaidCents),
            balance_due: fromCents(balanceDueCents),
            payment_status: paymentStatus,
            sale_status: "completed"
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/*
 * Get paginated sales history.
 */
async function getSales(businessId, filters = {}) {
    const { page, limit, offset } = getPagination(filters);
    const conditions = ["s.business_id = ?"];
    const params = [businessId];

    if (filters.search) {
        conditions.push(
            "(s.invoice_number LIKE ? OR c.customer_name LIKE ?)"
        );

        const search = `%${filters.search}%`;
        params.push(search, search);
    }

    if (filters.payment_status) {
        conditions.push("s.payment_status = ?");
        params.push(filters.payment_status);
    }

    if (filters.sale_status) {
        conditions.push("s.sale_status = ?");
        params.push(filters.sale_status);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM sales s
         LEFT JOIN customers c
            ON c.business_id = s.business_id
            AND c.customer_id = s.customer_id
         WHERE ${whereClause}`,
        params
    );

    const [rows] = await pool.execute(
        `SELECT
            s.sale_id,
            s.invoice_number,
            s.subtotal,
            s.discount_amount,
            s.tax_amount,
            s.total_amount,
            s.amount_paid,
            s.balance_due,
            s.payment_status,
            s.sale_status,
            s.created_at,
            c.customer_name
         FROM sales s
         LEFT JOIN customers c
            ON c.business_id = s.business_id
            AND c.customer_id = s.customer_id
         WHERE ${whereClause}
         ORDER BY s.created_at DESC
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

/*
 * Get one sale with its items and payment records.
 */
async function getSaleById(businessId, saleId) {
    const [sales] = await pool.execute(
        `SELECT
            s.*,
            c.customer_name,
            e.employee_id
         FROM sales s
         LEFT JOIN customers c
            ON c.business_id = s.business_id
            AND c.customer_id = s.customer_id
         LEFT JOIN employees e
            ON e.business_id = s.business_id
            AND e.employee_id = s.employee_id
         WHERE s.business_id = ? AND s.sale_id = ?
         LIMIT 1`,
        [businessId, saleId]
    );

    if (!sales.length) {
        throw new AppError("Sale not found.", 404);
    }

    const [items] = await pool.execute(
        `SELECT
            si.*,
            p.product_name,
            p.sku
         FROM sale_items si
         INNER JOIN products p
            ON p.business_id = si.business_id
            AND p.product_id = si.product_id
         WHERE si.business_id = ? AND si.sale_id = ?
         ORDER BY si.sale_item_id ASC`,
        [businessId, saleId]
    );

    const [payments] = await pool.execute(
        `SELECT
            payment_id,
            amount,
            payment_method,
            transaction_reference,
            payment_type,
            created_at
         FROM payments
         WHERE business_id = ? AND sale_id = ?
         ORDER BY created_at ASC`,
        [businessId, saleId]
    );

    return {
        sale: sales[0],
        items,
        payments
    };
}

module.exports = {
    getPosProducts,
    createSale,
    getSales,
    getSaleById
};