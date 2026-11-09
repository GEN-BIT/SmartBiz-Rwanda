const pool = require("../config/database");
const AppError = require("../utils/AppError");

function validateId(id, fieldName = "Product ID") {
    if (!/^[1-9]\d*$/.test(String(id || ""))) {
        throw new AppError(`${fieldName} must be a valid positive number.`, 400);
    }
}

function validateDecimal(value, fieldName, decimalPlaces = 2) {
    const pattern = decimalPlaces === 3
        ? /^\d{1,13}(\.\d{1,3})?$/
        : /^\d{1,13}(\.\d{1,2})?$/;

    if (
        typeof value !== "string" &&
        typeof value !== "number"
    ) {
        throw new AppError(`${fieldName} must be a non-negative number.`, 400);
    }

    if (!pattern.test(String(value))) {
        throw new AppError(
            `${fieldName} must be non-negative and have at most ${decimalPlaces} decimal places.`,
            400
        );
    }

    return String(value);
}

function handleDatabaseError(error) {
    if (error.code === "ER_DUP_ENTRY") {
        throw new AppError(
            "This SKU or barcode is already used by another product in this business.",
            409
        );
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
        throw new AppError("The selected category does not exist.", 400);
    }

    throw error;
}

async function validateCategory(businessId, categoryId) {
    if (categoryId === null || categoryId === undefined || categoryId === "") {
        return null;
    }

    validateId(categoryId, "Category ID");

    const [rows] = await pool.execute(
        `SELECT category_id
         FROM categories
         WHERE business_id = ?
           AND category_id = ?
           AND status = 'active'
         LIMIT 1`,
        [businessId, categoryId]
    );

    if (rows.length === 0) {
        throw new AppError(
            "The selected category does not exist or is inactive in this business.",
            400
        );
    }

    return String(categoryId);
}

async function getProductById(businessId, productId) {
    validateId(productId);

    const [rows] = await pool.execute(
        `SELECT
            p.product_id,
            p.category_id,
            c.category_name,
            p.product_name,
            p.sku,
            p.barcode,
            p.description,
            p.cost_price,
            p.selling_price,
            p.unit,
            p.reorder_level,
            p.status,
            p.created_at,
            p.updated_at,
            COALESCE(i.quantity, 0.000) AS stock_quantity
         FROM products p
         LEFT JOIN categories c
            ON c.business_id = p.business_id
           AND c.category_id = p.category_id
         LEFT JOIN inventory i
            ON i.business_id = p.business_id
           AND i.product_id = p.product_id
         WHERE p.business_id = ?
           AND p.product_id = ?
         LIMIT 1`,
        [businessId, productId]
    );

    if (rows.length === 0) {
        throw new AppError("Product not found.", 404);
    }

    return rows[0];
}

async function getProducts(businessId, filters = {}) {
    const conditions = ["p.business_id = ?"];
    const values = [businessId];

    if (filters.status !== undefined) {
        if (!["active", "inactive"].includes(filters.status)) {
            throw new AppError("Status must be active or inactive.", 400);
        }

        conditions.push("p.status = ?");
        values.push(filters.status);
    }

    if (filters.category_id !== undefined && filters.category_id !== "") {
        validateId(filters.category_id, "Category ID");
        conditions.push("p.category_id = ?");
        values.push(filters.category_id);
    }

    if (filters.search !== undefined && filters.search.trim() !== "") {
        const search = `%${filters.search.trim()}%`;

        conditions.push(
            `(p.product_name LIKE ?
              OR p.sku LIKE ?
              OR p.barcode LIKE ?)`
        );

        values.push(search, search, search);
    }

    const page = Number(filters.page || 1);
    const limit = Number(filters.limit || 20);

    if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
    ) {
        throw new AppError("Invalid pagination values.", 400);
    }

    const whereClause = conditions.join(" AND ");
    const offset = (page - 1) * limit;

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM products p
         WHERE ${whereClause}`,
        values
    );

    const [rows] = await pool.execute(
        `SELECT
            p.product_id,
            p.category_id,
            c.category_name,
            p.product_name,
            p.sku,
            p.barcode,
            p.description,
            p.cost_price,
            p.selling_price,
            p.unit,
            p.reorder_level,
            p.status,
            p.created_at,
            p.updated_at,
            COALESCE(i.quantity, 0.000) AS stock_quantity
         FROM products p
         LEFT JOIN categories c
            ON c.business_id = p.business_id
           AND c.category_id = p.category_id
         LEFT JOIN inventory i
            ON i.business_id = p.business_id
           AND i.product_id = p.product_id
         WHERE ${whereClause}
         ORDER BY p.created_at DESC, p.product_id DESC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    return {
        products: rows,
        pagination: {
            total: countRows[0].total,
            page,
            limit,
            total_pages: Math.ceil(Number(countRows[0].total) / limit)
        }
    };
}

async function createProduct(businessId, data) {
    if (
        typeof data.product_name !== "string" ||
        !data.product_name.trim() ||
        data.product_name.trim().length > 150
    ) {
        throw new AppError("Product name must contain 1–150 characters.", 400);
    }

    const categoryId = await validateCategory(businessId, data.category_id);

    const costPrice = validateDecimal(
        data.cost_price === undefined ? "0.00" : data.cost_price,
        "Cost price"
    );

    const sellingPrice = validateDecimal(
        data.selling_price === undefined ? "0.00" : data.selling_price,
        "Selling price"
    );

    const reorderLevel = validateDecimal(
        data.reorder_level === undefined ? "0.000" : data.reorder_level,
        "Reorder level",
        3
    );

    const unit = data.unit === undefined ? "piece" : data.unit;

    if (
        typeof unit !== "string" ||
        !unit.trim() ||
        unit.trim().length > 30
    ) {
        throw new AppError("Unit must contain 1–30 characters.", 400);
    }

    const description = data.description == null
        ? null
        : String(data.description).trim();

    if (description && description.length > 65535) {
        throw new AppError("Description is too long.", 400);
    }

    const sku = data.sku == null || data.sku === ""
        ? null
        : String(data.sku).trim();

    const barcode = data.barcode == null || data.barcode === ""
        ? null
        : String(data.barcode).trim();

    if (sku && sku.length > 80) {
        throw new AppError("SKU cannot exceed 80 characters.", 400);
    }

    if (barcode && barcode.length > 100) {
        throw new AppError("Barcode cannot exceed 100 characters.", 400);
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO products (
                business_id,
                category_id,
                product_name,
                sku,
                barcode,
                description,
                cost_price,
                selling_price,
                unit,
                reorder_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                businessId,
                categoryId,
                data.product_name.trim(),
                sku,
                barcode,
                description || null,
                costPrice,
                sellingPrice,
                unit.trim(),
                reorderLevel
            ]
        );

        return getProductById(businessId, result.insertId);

    } catch (error) {
        handleDatabaseError(error);
    }
}

async function updateProduct(businessId, productId, data) {
    validateId(productId);

    const allowedFields = [
        "category_id",
        "product_name",
        "sku",
        "barcode",
        "description",
        "cost_price",
        "selling_price",
        "unit",
        "reorder_level"
    ];

    if (Object.keys(data).length === 0) {
        throw new AppError("Provide at least one field to update.", 400);
    }

    for (const field of Object.keys(data)) {
        if (!allowedFields.includes(field)) {
            throw new AppError(`Field '${field}' cannot be updated.`, 400);
        }
    }

    await getProductById(businessId, productId);

    const updates = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(data, "category_id")) {
        const categoryId = await validateCategory(businessId, data.category_id);
        updates.push("category_id = ?");
        values.push(categoryId);
    }

    if (Object.prototype.hasOwnProperty.call(data, "product_name")) {
        if (
            typeof data.product_name !== "string" ||
            !data.product_name.trim() ||
            data.product_name.trim().length > 150
        ) {
            throw new AppError("Product name must contain 1–150 characters.", 400);
        }

        updates.push("product_name = ?");
        values.push(data.product_name.trim());
    }

    for (const field of ["sku", "barcode"]) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            const value = data[field] == null || data[field] === ""
                ? null
                : String(data[field]).trim();

            const maxLength = field === "sku" ? 80 : 100;

            if (value && value.length > maxLength) {
                throw new AppError(
                    `${field.toUpperCase()} cannot exceed ${maxLength} characters.`,
                    400
                );
            }

            updates.push(`${field} = ?`);
            values.push(value);
        }
    }

    if (Object.prototype.hasOwnProperty.call(data, "description")) {
        const description = data.description == null
            ? null
            : String(data.description).trim();

        if (description && description.length > 65535) {
            throw new AppError("Description is too long.", 400);
        }

        updates.push("description = ?");
        values.push(description || null);
    }

    for (const field of ["cost_price", "selling_price"]) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            updates.push(`${field} = ?`);
            values.push(validateDecimal(data[field], field));
        }
    }

    if (Object.prototype.hasOwnProperty.call(data, "reorder_level")) {
        updates.push("reorder_level = ?");
        values.push(validateDecimal(data.reorder_level, "Reorder level", 3));
    }

    if (Object.prototype.hasOwnProperty.call(data, "unit")) {
        if (
            typeof data.unit !== "string" ||
            !data.unit.trim() ||
            data.unit.trim().length > 30
        ) {
            throw new AppError("Unit must contain 1–30 characters.", 400);
        }

        updates.push("unit = ?");
        values.push(data.unit.trim());
    }

    values.push(businessId, productId);

    try {
        await pool.execute(
            `UPDATE products
             SET ${updates.join(", ")}
             WHERE business_id = ?
               AND product_id = ?`,
            values
        );

        return getProductById(businessId, productId);

    } catch (error) {
        handleDatabaseError(error);
    }
}

async function setProductStatus(businessId, productId, status) {
    validateId(productId);

    if (!["active", "inactive"].includes(status)) {
        throw new AppError("Status must be active or inactive.", 400);
    }

    await getProductById(businessId, productId);

    await pool.execute(
        `UPDATE products
         SET status = ?
         WHERE business_id = ?
           AND product_id = ?`,
        [status, businessId, productId]
    );

    return getProductById(businessId, productId);
}

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    setProductStatus
};