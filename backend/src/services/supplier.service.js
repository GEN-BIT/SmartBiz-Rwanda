const pool = require("../config/database");
const AppError = require("../utils/AppError");

function validateId(value, field = "Supplier ID") {
    if (!/^[1-9]\d*$/.test(String(value || ""))) {
        throw new AppError(`${field} must be a valid positive number.`, 400);
    }
}

function getPagination(filters = {}) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));

    return {
        page,
        limit,
        offset: (page - 1) * limit
    };
}

function handleDatabaseError(error) {
    if (error.code === "ER_DUP_ENTRY") {
        throw new AppError("This supplier already exists.", 409);
    }

    throw error;
}

async function getSuppliers(businessId, filters = {}) {
    const { page, limit, offset } = getPagination(filters);
    const conditions = ["s.business_id = ?"];
    const params = [businessId];

    if (filters.search) {
        conditions.push(`(
            s.supplier_name LIKE ?
            OR s.contact_person LIKE ?
            OR s.phone LIKE ?
            OR s.email LIKE ?
        )`);

        const search = `%${filters.search}%`;
        params.push(search, search, search, search);
    }

    if (["active", "inactive"].includes(filters.status)) {
        conditions.push("s.status = ?");
        params.push(filters.status);
    }

    const where = conditions.join(" AND ");

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM suppliers s
         WHERE ${where}`,
        params
    );

    const [rows] = await pool.execute(
        `SELECT
            s.supplier_id,
            s.supplier_name,
            s.contact_person,
            s.phone,
            s.email,
            s.address,
            s.status,
            s.created_at,
            COUNT(p.purchase_id) AS purchase_count,
            COALESCE(SUM(
                CASE
                    WHEN p.purchase_status <> 'cancelled'
                    THEN p.balance_due
                    ELSE 0
                END
            ), 0.00) AS balance_due
         FROM suppliers s
         LEFT JOIN purchases p
            ON p.business_id = s.business_id
           AND p.supplier_id = s.supplier_id
         WHERE ${where}
         GROUP BY
            s.supplier_id,
            s.supplier_name,
            s.contact_person,
            s.phone,
            s.email,
            s.address,
            s.status,
            s.created_at
         ORDER BY s.supplier_name ASC
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

async function getSupplierById(businessId, supplierId) {
    validateId(supplierId);

    const [rows] = await pool.execute(
        `SELECT
            s.supplier_id,
            s.supplier_name,
            s.contact_person,
            s.phone,
            s.email,
            s.address,
            s.status,
            s.created_at,
            COUNT(p.purchase_id) AS purchase_count,
            COALESCE(SUM(
                CASE
                    WHEN p.purchase_status <> 'cancelled'
                    THEN p.balance_due
                    ELSE 0
                END
            ), 0.00) AS balance_due
         FROM suppliers s
         LEFT JOIN purchases p
            ON p.business_id = s.business_id
           AND p.supplier_id = s.supplier_id
         WHERE s.business_id = ?
           AND s.supplier_id = ?
         GROUP BY
            s.supplier_id,
            s.supplier_name,
            s.contact_person,
            s.phone,
            s.email,
            s.address,
            s.status,
            s.created_at
         LIMIT 1`,
        [businessId, supplierId]
    );

    if (!rows.length) {
        throw new AppError("Supplier not found.", 404);
    }

    return rows[0];
}

function validateSupplierData(data, partial = false) {
    const allowed = [
        "supplier_name",
        "contact_person",
        "phone",
        "email",
        "address"
    ];

    for (const field of Object.keys(data)) {
        if (!allowed.includes(field)) {
            throw new AppError(`Field '${field}' cannot be updated.`, 400);
        }
    }

    if (!partial || Object.prototype.hasOwnProperty.call(data, "supplier_name")) {
        if (
            typeof data.supplier_name !== "string" ||
            !data.supplier_name.trim() ||
            data.supplier_name.trim().length > 150
        ) {
            throw new AppError("Supplier name is required and cannot exceed 150 characters.", 400);
        }
    }

    const limits = {
        contact_person: 150,
        phone: 20,
        email: 150,
        address: 255
    };

    for (const [field, max] of Object.entries(limits)) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            const value = data[field] == null ? "" : String(data[field]).trim();

            if (value.length > max) {
                throw new AppError(`${field} cannot exceed ${max} characters.`, 400);
            }

            if (field === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                throw new AppError("Enter a valid supplier email address.", 400);
            }
        }
    }
}

async function createSupplier(businessId, data) {
    validateSupplierData(data);

    const values = [
        businessId,
        data.supplier_name.trim(),
        data.contact_person ? String(data.contact_person).trim() : null,
        data.phone ? String(data.phone).trim() : null,
        data.email ? String(data.email).trim() : null,
        data.address ? String(data.address).trim() : null
    ];

    try {
        const [result] = await pool.execute(
            `INSERT INTO suppliers (
                business_id,
                supplier_name,
                contact_person,
                phone,
                email,
                address
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            values
        );

        return getSupplierById(businessId, result.insertId);
    } catch (error) {
        handleDatabaseError(error);
    }
}

async function updateSupplier(businessId, supplierId, data) {
    validateId(supplierId);

    if (!data || !Object.keys(data).length) {
        throw new AppError("Provide at least one field to update.", 400);
    }

    validateSupplierData(data, true);
    await getSupplierById(businessId, supplierId);

    const fields = [];
    const values = [];

    for (const field of [
        "supplier_name",
        "contact_person",
        "phone",
        "email",
        "address"
    ]) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            fields.push(`${field} = ?`);

            const value = data[field];
            values.push(
                value == null || String(value).trim() === ""
                    ? null
                    : String(value).trim()
            );
        }
    }

    try {
        await pool.execute(
            `UPDATE suppliers
             SET ${fields.join(", ")}
             WHERE business_id = ? AND supplier_id = ?`,
            [...values, businessId, supplierId]
        );

        return getSupplierById(businessId, supplierId);
    } catch (error) {
        handleDatabaseError(error);
    }
}

async function setSupplierStatus(businessId, supplierId, status) {
    validateId(supplierId);

    if (!["active", "inactive"].includes(status)) {
        throw new AppError("Status must be active or inactive.", 400);
    }

    await getSupplierById(businessId, supplierId);

    await pool.execute(
        `UPDATE suppliers
         SET status = ?
         WHERE business_id = ? AND supplier_id = ?`,
        [status, businessId, supplierId]
    );

    return getSupplierById(businessId, supplierId);
}

async function getSupplierPurchases(businessId, supplierId, filters = {}) {
    validateId(supplierId);
    await getSupplierById(businessId, supplierId);

    const { page, limit, offset } = getPagination(filters);
    const conditions = [
        "p.business_id = ?",
        "p.supplier_id = ?"
    ];
    const params = [businessId, supplierId];

    if (["pending", "received", "cancelled"].includes(filters.status)) {
        conditions.push("p.purchase_status = ?");
        params.push(filters.status);
    }

    const where = conditions.join(" AND ");

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM purchases p
         WHERE ${where}`,
        params
    );

    const [rows] = await pool.execute(
        `SELECT
            p.purchase_id,
            p.purchase_number,
            p.subtotal,
            p.tax_amount,
            p.total_amount,
            p.amount_paid,
            p.balance_due,
            p.payment_status,
            p.purchase_status,
            p.created_at
         FROM purchases p
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

module.exports = {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    setSupplierStatus,
    getSupplierPurchases
};
