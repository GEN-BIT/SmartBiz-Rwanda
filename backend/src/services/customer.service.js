/*
 * SmartBiz Rwanda - Customer and Debt Service
 */

const pool = require("../config/database");
const AppError = require("../utils/AppError");

function validateId(value, fieldName = "ID") {
    if (!/^[1-9]\d*$/.test(String(value || ""))) {
        throw new AppError(`${fieldName} must be a valid positive number.`, 400);
    }
}

function validateMoney(value, fieldName, allowZero = true) {
    const text = String(value ?? "");

    if (!/^\d{1,13}(\.\d{1,2})?$/.test(text)) {
        throw new AppError(
            `${fieldName} must be a valid amount with up to 2 decimal places.`,
            400
        );
    }

    const cents = Math.round(Number(text) * 100);

    if (!Number.isSafeInteger(cents) || (!allowZero && cents <= 0)) {
        throw new AppError(`${fieldName} is invalid.`, 400);
    }

    return cents;
}

function toMoney(cents) {
    return (cents / 100).toFixed(2);
}

function getPagination(filters = {}) {
    const page = Number(filters.page || 1);
    const limit = Number(filters.limit || 20);

    if (
        !Number.isInteger(page) || page < 1 ||
        !Number.isInteger(limit) || limit < 1 || limit > 100
    ) {
        throw new AppError("Invalid pagination values.", 400);
    }

    return {
        page,
        limit,
        offset: (page - 1) * limit
    };
}

function validateCustomerData(data, partial = false) {
    const fields = [
        "customer_name",
        "phone",
        "email",
        "address",
        "credit_limit"
    ];

    for (const field of Object.keys(data)) {
        if (!fields.includes(field)) {
            throw new AppError(`Field '${field}' cannot be updated.`, 400);
        }
    }

    if (
        !partial || Object.prototype.hasOwnProperty.call(data, "customer_name")
    ) {
        if (
            typeof data.customer_name !== "string" ||
            !data.customer_name.trim() ||
            data.customer_name.trim().length > 150
        ) {
            throw new AppError(
                "Customer name must contain 1 to 150 characters.",
                400
            );
        }
    }

    for (const field of ["phone", "email", "address"]) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            const value = data[field];

            if (value !== null && typeof value !== "string") {
                throw new AppError(`${field} must be text.`, 400);
            }

            if (field === "phone" && value && value.length > 20) {
                throw new AppError("Phone cannot exceed 20 characters.", 400);
            }

            if (field === "email" && value && value.length > 150) {
                throw new AppError("Email cannot exceed 150 characters.", 400);
            }

            if (field === "address" && value && value.length > 255) {
                throw new AppError("Address cannot exceed 255 characters.", 400);
            }
        }
    }

    if (Object.prototype.hasOwnProperty.call(data, "credit_limit")) {
        validateMoney(data.credit_limit, "Credit limit");
    }
}

function handleDatabaseError(error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
        throw new AppError("The selected record does not exist.", 404);
    }

    throw error;
}

async function getCustomerById(businessId, customerId) {
    validateId(customerId, "Customer ID");

    const [rows] = await pool.execute(
        `SELECT
            c.customer_id,
            c.business_id,
            c.customer_name,
            c.phone,
            c.email,
            c.address,
            c.credit_limit,
            c.status,
            c.created_at,
            COALESCE(
                SUM(
                    CASE
                        WHEN s.sale_status = 'completed'
                        THEN s.balance_due
                        ELSE 0
                    END
                ), 0.00
            ) AS outstanding_balance,
            COUNT(
                CASE WHEN s.sale_status = 'completed'
                THEN s.sale_id END
            ) AS completed_sales
         FROM customers c
         LEFT JOIN sales s
            ON s.business_id = c.business_id
           AND s.customer_id = c.customer_id
         WHERE c.business_id = ?
           AND c.customer_id = ?
         GROUP BY c.customer_id
         LIMIT 1`,
        [businessId, customerId]
    );

    if (!rows.length) {
        throw new AppError("Customer not found.", 404);
    }

    return rows[0];
}

async function getCustomers(businessId, filters = {}) {
    const { page, limit, offset } = getPagination(filters);

    const conditions = ["c.business_id = ?"];
    const values = [businessId];

    if (filters.status) {
        if (!["active", "inactive"].includes(filters.status)) {
            throw new AppError("Invalid customer status.", 400);
        }

        conditions.push("c.status = ?");
        values.push(filters.status);
    }

    if (filters.search && filters.search.trim()) {
        const search = `%${filters.search.trim()}%`;

        conditions.push(
            "(c.customer_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)"
        );

        values.push(search, search, search);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM customers c
         WHERE ${whereClause}`,
        values
    );

    const [rows] = await pool.execute(
        `SELECT
            c.customer_id,
            c.customer_name,
            c.phone,
            c.email,
            c.address,
            c.credit_limit,
            c.status,
            c.created_at,
            COALESCE(
                SUM(
                    CASE
                        WHEN s.sale_status = 'completed'
                        THEN s.balance_due
                        ELSE 0
                    END
                ), 0.00
            ) AS outstanding_balance,
            COUNT(
                CASE WHEN s.sale_status = 'completed'
                THEN s.sale_id END
            ) AS completed_sales
         FROM customers c
         LEFT JOIN sales s
            ON s.business_id = c.business_id
           AND s.customer_id = c.customer_id
         WHERE ${whereClause}
         GROUP BY c.customer_id
         ORDER BY c.created_at DESC, c.customer_id DESC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
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

async function createCustomer(businessId, data) {
    validateCustomerData(data);

    try {
        const [result] = await pool.execute(
            `INSERT INTO customers (
                business_id,
                customer_name,
                phone,
                email,
                address,
                credit_limit
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                businessId,
                data.customer_name.trim(),
                data.phone || null,
                data.email || null,
                data.address || null,
                toMoney(
                    validateMoney(
                        data.credit_limit === undefined
                            ? "0.00"
                            : data.credit_limit,
                        "Credit limit"
                    )
                )
            ]
        );

        return getCustomerById(businessId, result.insertId);

    } catch (error) {
        handleDatabaseError(error);
    }
}

async function updateCustomer(businessId, customerId, data) {
    validateId(customerId, "Customer ID");
    validateCustomerData(data, true);

    if (!Object.keys(data).length) {
        throw new AppError("Provide at least one field to update.", 400);
    }

    await getCustomerById(businessId, customerId);

    const updates = [];
    const values = [];

    for (const field of [
        "customer_name",
        "phone",
        "email",
        "address",
        "credit_limit"
    ]) {
        if (!Object.prototype.hasOwnProperty.call(data, field)) {
            continue;
        }

        updates.push(`${field} = ?`);

        if (field === "credit_limit") {
            values.push(toMoney(validateMoney(data[field], "Credit limit")));
        } else if (field === "customer_name") {
            values.push(data[field].trim());
        } else {
            values.push(data[field] || null);
        }
    }

    values.push(businessId, customerId);

    await pool.execute(
        `UPDATE customers
         SET ${updates.join(", ")}
         WHERE business_id = ?
           AND customer_id = ?`,
        values
    );

    return getCustomerById(businessId, customerId);
}

async function setCustomerStatus(businessId, customerId, status) {
    validateId(customerId, "Customer ID");

    if (!["active", "inactive"].includes(status)) {
        throw new AppError("Status must be active or inactive.", 400);
    }

    await getCustomerById(businessId, customerId);

    await pool.execute(
        `UPDATE customers
         SET status = ?
         WHERE business_id = ?
           AND customer_id = ?`,
        [status, businessId, customerId]
    );

    return getCustomerById(businessId, customerId);
}

/*
 * List customers who have outstanding completed sales.
 */
async function getDebts(businessId, filters = {}) {
    const { page, limit, offset } = getPagination(filters);

    const conditions = [
        "s.business_id = ?",
        "s.sale_status = 'completed'",
        "s.balance_due > 0"
    ];

    const values = [businessId];

    if (filters.search && filters.search.trim()) {
        const search = `%${filters.search.trim()}%`;

        conditions.push(
            "(c.customer_name LIKE ? OR c.phone LIKE ? OR s.invoice_number LIKE ?)"
        );

        values.push(search, search, search);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM sales s
         INNER JOIN customers c
            ON c.business_id = s.business_id
           AND c.customer_id = s.customer_id
         WHERE ${whereClause}`,
        values
    );

    const [rows] = await pool.execute(
        `SELECT
            s.sale_id,
            s.invoice_number,
            s.customer_id,
            c.customer_name,
            c.phone,
            s.total_amount,
            s.amount_paid,
            s.balance_due,
            s.payment_status,
            s.created_at
         FROM sales s
         INNER JOIN customers c
            ON c.business_id = s.business_id
           AND c.customer_id = s.customer_id
         WHERE ${whereClause}
         ORDER BY s.created_at ASC, s.sale_id ASC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
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
 * Record a payment against one outstanding sale.
 */
async function recordDebtPayment(
    businessId,
    employeeId,
    saleId,
    data
) {
    validateId(saleId, "Sale ID");

    const amountCents = validateMoney(
        data.amount,
        "Payment amount",
        false
    );

    const allowedMethods = [
        "cash",
        "mobile_money",
        "bank_transfer",
        "card",
        "other"
    ];

    const paymentMethod = data.payment_method || "cash";

    if (!allowedMethods.includes(paymentMethod)) {
        throw new AppError("Invalid debt payment method.", 400);
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [sales] = await connection.execute(
            `SELECT
                sale_id,
                customer_id,
                total_amount,
                amount_paid,
                balance_due,
                payment_status,
                sale_status
             FROM sales
             WHERE business_id = ?
               AND sale_id = ?
             FOR UPDATE`,
            [businessId, saleId]
        );

        if (!sales.length) {
            throw new AppError("Sale not found.", 404);
        }

        const sale = sales[0];

        if (!sale.customer_id) {
            throw new AppError("This sale is not linked to a customer.", 400);
        }

        if (sale.sale_status !== "completed") {
            throw new AppError(
                "Payments can only be recorded for completed sales.",
                400
            );
        }

        const balanceCents = validateMoney(
            sale.balance_due,
            "Outstanding balance"
        );

        const paidCents = validateMoney(
            sale.amount_paid,
            "Amount already paid"
        );

        if (balanceCents <= 0) {
            throw new AppError("This sale has no outstanding balance.", 400);
        }

        if (amountCents > balanceCents) {
            throw new AppError(
                "Payment cannot exceed the outstanding balance.",
                400
            );
        }

        const newPaidCents = paidCents + amountCents;
        const newBalanceCents = balanceCents - amountCents;

        const newStatus = newBalanceCents === 0
            ? "paid"
            : "partial";

        await connection.execute(
            `INSERT INTO payments (
                business_id,
                sale_id,
                customer_id,
                employee_id,
                amount,
                payment_method,
                payment_type,
                transaction_reference,
                notes
            ) VALUES (?, ?, ?, ?, ?, ?, 'sale_payment', ?, ?)`,
            [
                businessId,
                saleId,
                sale.customer_id,
                employeeId,
                toMoney(amountCents),
                paymentMethod,
                data.transaction_reference || null,
                data.notes || "Customer debt payment"
            ]
        );

        await connection.execute(
            `UPDATE sales
             SET amount_paid = ?,
                 balance_due = ?,
                 payment_status = ?
             WHERE business_id = ?
               AND sale_id = ?`,
            [
                toMoney(newPaidCents),
                toMoney(newBalanceCents),
                newStatus,
                businessId,
                saleId
            ]
        );

        await connection.commit();

        return {
            sale_id: saleId,
            customer_id: sale.customer_id,
            amount_paid: toMoney(amountCents),
            total_amount_paid: toMoney(newPaidCents),
            balance_due: toMoney(newBalanceCents),
            payment_status: newStatus
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/*
 * Retrieve a customer's sales and payment history.
 */
async function getCustomerHistory(businessId, customerId) {
    validateId(customerId, "Customer ID");

    const customer = await getCustomerById(businessId, customerId);

    const [sales] = await pool.execute(
        `SELECT
            sale_id,
            invoice_number,
            subtotal,
            discount_amount,
            tax_amount,
            total_amount,
            amount_paid,
            balance_due,
            payment_status,
            sale_status,
            created_at
         FROM sales
         WHERE business_id = ?
           AND customer_id = ?
         ORDER BY created_at DESC`,
        [businessId, customerId]
    );

    const [payments] = await pool.execute(
        `SELECT
            payment_id,
            sale_id,
            amount,
            payment_method,
            payment_type,
            transaction_reference,
            notes,
            payment_date
         FROM payments
         WHERE business_id = ?
           AND customer_id = ?
         ORDER BY payment_date DESC`,
        [businessId, customerId]
    );

    return {
        customer,
        sales,
        payments
    };
}

module.exports = {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    setCustomerStatus,
    getDebts,
    recordDebtPayment,
    getCustomerHistory
};