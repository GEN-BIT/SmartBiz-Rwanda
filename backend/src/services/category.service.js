const pool = require("../config/database");
const AppError = require("../utils/AppError");

function validateId(id, fieldName = "Category ID") {
    if (!/^[1-9]\d*$/.test(String(id || ""))) {
        throw new AppError(`${fieldName} must be a valid positive number.`, 400);
    }
}

function handleDatabaseError(error) {
    if (error.code === "ER_DUP_ENTRY") {
        throw new AppError(
            "A category with this name already exists in this business.",
            409
        );
    }

    throw error;
}

async function getCategories(businessId) {
    const [rows] = await pool.execute(
        `SELECT
            c.category_id,
            c.category_name,
            c.description,
            c.status,
            c.created_at,
            COUNT(p.product_id) AS product_count
         FROM categories c
         LEFT JOIN products p
            ON p.business_id = c.business_id
           AND p.category_id = c.category_id
         WHERE c.business_id = ?
         GROUP BY
            c.category_id,
            c.category_name,
            c.description,
            c.status,
            c.created_at
         ORDER BY c.category_name ASC`,
        [businessId]
    );

    return rows;
}

async function getCategoryById(businessId, categoryId) {
    validateId(categoryId);

    const [rows] = await pool.execute(
        `SELECT
            c.category_id,
            c.category_name,
            c.description,
            c.status,
            c.created_at,
            COUNT(p.product_id) AS product_count
         FROM categories c
         LEFT JOIN products p
            ON p.business_id = c.business_id
           AND p.category_id = c.category_id
         WHERE c.business_id = ?
           AND c.category_id = ?
         GROUP BY
            c.category_id,
            c.category_name,
            c.description,
            c.status,
            c.created_at
         LIMIT 1`,
        [businessId, categoryId]
    );

    if (rows.length === 0) {
        throw new AppError("Category not found.", 404);
    }

    return rows[0];
}

async function createCategory(businessId, data) {
    const categoryName = data.category_name;

    if (typeof categoryName !== "string" || !categoryName.trim()) {
        throw new AppError("Category name is required.", 400);
    }

    if (categoryName.trim().length > 100) {
        throw new AppError("Category name cannot exceed 100 characters.", 400);
    }

    const description = data.description == null
        ? null
        : String(data.description).trim();

    if (description && description.length > 255) {
        throw new AppError("Description cannot exceed 255 characters.", 400);
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO categories (
                business_id,
                category_name,
                description
            ) VALUES (?, ?, ?)`,
            [businessId, categoryName.trim(), description || null]
        );

        return getCategoryById(businessId, result.insertId);

    } catch (error) {
        handleDatabaseError(error);
    }
}

async function updateCategory(businessId, categoryId, data) {
    validateId(categoryId);

    const allowedFields = ["category_name", "description", "status"];
    const updates = [];
    const values = [];

    if (Object.keys(data).length === 0) {
        throw new AppError("Provide at least one field to update.", 400);
    }

    for (const field of Object.keys(data)) {
        if (!allowedFields.includes(field)) {
            throw new AppError(`Field '${field}' cannot be updated.`, 400);
        }
    }

    if (Object.prototype.hasOwnProperty.call(data, "category_name")) {
        if (
            typeof data.category_name !== "string" ||
            !data.category_name.trim() ||
            data.category_name.trim().length > 100
        ) {
            throw new AppError("Category name must contain 1–100 characters.", 400);
        }

        updates.push("category_name = ?");
        values.push(data.category_name.trim());
    }

    if (Object.prototype.hasOwnProperty.call(data, "description")) {
        const description = data.description == null
            ? null
            : String(data.description).trim();

        if (description && description.length > 255) {
            throw new AppError("Description cannot exceed 255 characters.", 400);
        }

        updates.push("description = ?");
        values.push(description || null);
    }

    if (Object.prototype.hasOwnProperty.call(data, "status")) {
        if (!["active", "inactive"].includes(data.status)) {
            throw new AppError("Status must be active or inactive.", 400);
        }

        if (data.status === "inactive") {
            const [products] = await pool.execute(
                `SELECT product_id
                 FROM products
                 WHERE business_id = ?
                   AND category_id = ?
                   AND status = 'active'
                 LIMIT 1`,
                [businessId, categoryId]
            );

            if (products.length > 0) {
                throw new AppError(
                    "This category has active products. Move or deactivate those products first.",
                    409
                );
            }
        }

        updates.push("status = ?");
        values.push(data.status);
    }

    await getCategoryById(businessId, categoryId);

    values.push(businessId, categoryId);

    try {
        await pool.execute(
            `UPDATE categories
             SET ${updates.join(", ")}
             WHERE business_id = ?
               AND category_id = ?`,
            values
        );

        return getCategoryById(businessId, categoryId);

    } catch (error) {
        handleDatabaseError(error);
    }
}

async function setCategoryStatus(businessId, categoryId, status) {
    return updateCategory(businessId, categoryId, { status });
}

module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    setCategoryStatus
};