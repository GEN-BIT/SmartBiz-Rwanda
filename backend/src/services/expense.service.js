/*
 * SmartBiz Rwanda - Expense Service
 * Tenant-scoped expense management.
 */

const pool = require("../config/database");
const AppError = require("../utils/AppError");

const PAYMENT_METHODS = [
    "cash",
    "mobile_money",
    "bank_transfer",
    "card",
    "other"
];

function validateExpense(data) {
    const category = String(data.expense_category || "").trim();
    const description = String(data.description || "").trim();
    const amount = String(data.amount ?? "");
    const paymentMethod = String(data.payment_method || "cash");
    const receiptNumber = String(data.receipt_number || "").trim();
    const expenseDate = String(data.expense_date || "");

    if (!category || category.length > 100) {
        throw new AppError(
            "Expense category is required and must not exceed 100 characters.",
            400
        );
    }

    if (description.length > 255) {
        throw new AppError("Description must not exceed 255 characters.", 400);
    }

    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
        throw new AppError("Enter a valid expense amount greater than zero.", 400);
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
        throw new AppError("Invalid expense payment method.", 400);
    }

    if (receiptNumber.length > 100) {
        throw new AppError("Receipt number must not exceed 100 characters.", 400);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
        throw new AppError("A valid expense date is required (YYYY-MM-DD).", 400);
    }

    const parsedDate = new Date(`${expenseDate}T00:00:00Z`);

    if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== expenseDate
    ) {
        throw new AppError("The expense date is invalid.", 400);
    }

    return {
        expense_category: category,
        description: description || null,
        amount,
        payment_method: paymentMethod,
        receipt_number: receiptNumber || null,
        expense_date: expenseDate
    };
}

function getPagination(query = {}) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(query.limit, 10) || 20)
    );

    return {
        page,
        limit,
        offset: (page - 1) * limit
    };
}

function getFilters(query = {}) {
    const conditions = ["e.business_id = ?"];
    const values = [];

    if (query.search) {
        conditions.push(`(
            e.expense_category LIKE ?
            OR e.description LIKE ?
            OR e.receipt_number LIKE ?
        )`);

        const search = `%${String(query.search).trim()}%`;
        values.push(search, search, search);
    }

    if (query.category) {
        conditions.push("e.expense_category = ?");
        values.push(String(query.category));
    }

    if (query.payment_method) {
        if (!PAYMENT_METHODS.includes(query.payment_method)) {
            throw new AppError("Invalid payment method filter.", 400);
        }

        conditions.push("e.payment_method = ?");
        values.push(query.payment_method);
    }

    if (query.date_from) {
        conditions.push("e.expense_date >= ?");
        values.push(query.date_from);
    }

    if (query.date_to) {
        conditions.push("e.expense_date <= ?");
        values.push(query.date_to);
    }

    return {
        sql: conditions.join(" AND "),
        values
    };
}

async function getExpenses(businessId, query = {}) {
    const { page, limit, offset } = getPagination(query);
    const filters = getFilters(query);

    const [rows] = await pool.execute(
        `SELECT
            e.expense_id,
            e.business_id,
            e.employee_id,
            e.expense_category,
            e.description,
            e.amount,
            e.payment_method,
            e.receipt_number,
            e.expense_date,
            e.created_at,
            u.full_name AS employee_name
         FROM expenses e
         INNER JOIN employees em
            ON em.business_id = e.business_id
            AND em.employee_id = e.employee_id
         INNER JOIN users u
            ON u.user_id = em.user_id
         WHERE ${filters.sql}
         ORDER BY e.expense_date DESC, e.expense_id DESC
         LIMIT ? OFFSET ?`,
        [businessId, ...filters.values, limit, offset]
    );

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM expenses e
         WHERE ${filters.sql}`,
        [businessId, ...filters.values]
    );

    const total = Number(countRows[0].total || 0);

    return {
        data: rows,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit)
        }
    };
}

async function getExpenseById(businessId, expenseId) {
    const [rows] = await pool.execute(
        `SELECT
            e.expense_id,
            e.business_id,
            e.employee_id,
            e.expense_category,
            e.description,
            e.amount,
            e.payment_method,
            e.receipt_number,
            e.expense_date,
            e.created_at,
            u.full_name AS employee_name
         FROM expenses e
         INNER JOIN employees em
            ON em.business_id = e.business_id
            AND em.employee_id = e.employee_id
         INNER JOIN users u
            ON u.user_id = em.user_id
         WHERE e.business_id = ?
           AND e.expense_id = ?
         LIMIT 1`,
        [businessId, expenseId]
    );

    if (!rows.length) {
        throw new AppError("Expense not found.", 404);
    }

    return rows[0];
}

async function createExpense(businessId, employeeId, data) {
    const expense = validateExpense(data);

    const [result] = await pool.execute(
        `INSERT INTO expenses (
            business_id,
            employee_id,
            expense_category,
            description,
            amount,
            payment_method,
            receipt_number,
            expense_date
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            businessId,
            employeeId,
            expense.expense_category,
            expense.description,
            expense.amount,
            expense.payment_method,
            expense.receipt_number,
            expense.expense_date
        ]
    );

    return getExpenseById(businessId, result.insertId);
}

async function updateExpense(businessId, expenseId, data) {
    const expense = validateExpense(data);

    const [result] = await pool.execute(
        `UPDATE expenses
         SET expense_category = ?,
             description = ?,
             amount = ?,
             payment_method = ?,
             receipt_number = ?,
             expense_date = ?
         WHERE business_id = ?
           AND expense_id = ?`,
        [
            expense.expense_category,
            expense.description,
            expense.amount,
            expense.payment_method,
            expense.receipt_number,
            expense.expense_date,
            businessId,
            expenseId
        ]
    );

    if (!result.affectedRows) {
        throw new AppError("Expense not found or no changes were made.", 404);
    }

    return getExpenseById(businessId, expenseId);
}

async function getExpenseSummary(businessId, query = {}) {
    const filters = getFilters(query);

    const [summaryRows] = await pool.execute(
        `SELECT
            COUNT(*) AS total_expenses,
            COALESCE(SUM(e.amount), 0) AS total_amount,
            COALESCE(AVG(e.amount), 0) AS average_amount
         FROM expenses e
         WHERE ${filters.sql}`,
        [businessId, ...filters.values]
    );

    const [categoryRows] = await pool.execute(
        `SELECT
            e.expense_category,
            COUNT(*) AS expense_count,
            COALESCE(SUM(e.amount), 0) AS total_amount
         FROM expenses e
         WHERE ${filters.sql}
         GROUP BY e.expense_category
         ORDER BY total_amount DESC`,
        [businessId, ...filters.values]
    );

    const [paymentRows] = await pool.execute(
        `SELECT
            e.payment_method,
            COUNT(*) AS expense_count,
            COALESCE(SUM(e.amount), 0) AS total_amount
         FROM expenses e
         WHERE ${filters.sql}
         GROUP BY e.payment_method
         ORDER BY total_amount DESC`,
        [businessId, ...filters.values]
    );

    return {
        summary: summaryRows[0],
        by_category: categoryRows,
        by_payment_method: paymentRows
    };
}

module.exports = {
    getExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    getExpenseSummary
};

