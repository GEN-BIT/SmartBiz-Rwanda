
const pool = require("../config/database");
const { hashPassword } = require("../utils/password");
const AppError = require("../utils/AppError");

const ALLOWED_ROLES = ["manager", "cashier", "stock_manager"];
const ALLOWED_STATUSES = ["active", "inactive"];

function validateId(value, label) {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new AppError(`Invalid ${label}.`, 400);
    }

    return id;
}

function validateRole(role) {
    if (!ALLOWED_ROLES.includes(role)) {
        throw new AppError(
            "Select a valid employee role.",
            400
        );
    }
}

async function getEmployeeRecord(businessId, employeeId) {
    const [rows] = await pool.execute(
        `SELECT
            e.employee_id,
            e.user_id,
            e.business_id,
            u.full_name,
            u.email,
            u.phone,
            e.role,
            e.status,
            e.hired_at,
            e.created_at
         FROM employees e
         INNER JOIN users u
            ON u.user_id = e.user_id
         WHERE e.business_id = ?
           AND e.employee_id = ?
         LIMIT 1`,
        [businessId, employeeId]
    );

    return rows[0] || null;
}

async function getEmployees(businessId, query = {}) {
    businessId = validateId(businessId, "business ID");

    const search = String(query.search || "").trim();
    const role = String(query.role || "").trim();
    const status = String(query.status || "").trim();

    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(query.limit, 10) || 10)
    );

    const offset = (page - 1) * limit;

    if (role && !["owner", ...ALLOWED_ROLES].includes(role)) {
        throw new AppError("Invalid employee role filter.", 400);
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
        throw new AppError("Invalid employee status filter.", 400);
    }

    const conditions = ["e.business_id = ?"];
    const params = [businessId];

    if (search) {
        conditions.push(
            "(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)"
        );

        const searchValue = `%${search}%`;

        params.push(searchValue, searchValue, searchValue);
    }

    if (role) {
        conditions.push("e.role = ?");
        params.push(role);
    }

    if (status) {
        conditions.push("e.status = ?");
        params.push(status);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM employees e
         INNER JOIN users u
            ON u.user_id = e.user_id
         WHERE ${whereClause}`,
        params
    );

    const [employees] = await pool.execute(
        `SELECT
            e.employee_id,
            e.user_id,
            u.full_name,
            u.email,
            u.phone,
            e.role,
            e.status,
            e.hired_at,
            e.created_at
         FROM employees e
         INNER JOIN users u
            ON u.user_id = e.user_id
         WHERE ${whereClause}
         ORDER BY e.created_at DESC, e.employee_id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const [statisticsRows] = await pool.execute(
        `SELECT
            COUNT(*) AS total_employees,
            SUM(e.status = 'active') AS active_employees,
            SUM(e.status = 'inactive') AS inactive_employees,
            SUM(e.role = 'manager') AS managers,
            SUM(e.role = 'cashier') AS cashiers,
            SUM(e.role = 'stock_manager') AS stock_managers
         FROM employees e
         WHERE e.business_id = ?`,
        [businessId]
    );

    const statistics = statisticsRows[0];

    return {
        employees,
        pagination: {
            page,
            limit,
            total: Number(countRows[0].total),
            total_pages: Math.ceil(Number(countRows[0].total) / limit)
        },
        statistics: {
            total_employees: Number(statistics.total_employees || 0),
            active_employees: Number(statistics.active_employees || 0),
            inactive_employees: Number(statistics.inactive_employees || 0),
            managers: Number(statistics.managers || 0),
            cashiers: Number(statistics.cashiers || 0),
            stock_managers: Number(statistics.stock_managers || 0)
        }
    };
}

async function createEmployee(businessId, data = {}) {
    businessId = validateId(businessId, "business ID");

    const fullName = String(data.full_name || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const phone = String(data.phone || "").trim() || null;
    const password = data.password;
    const role = String(data.role || "").trim();

    if (!fullName || !email || !password || !role) {
        throw new AppError(
            "Full name, email, password and role are required.",
            400
        );
    }

    if (fullName.length > 150 || email.length > 150) {
        throw new AppError(
            "The name or email address is too long.",
            400
        );
    }

    if (phone && phone.length > 20) {
        throw new AppError("Phone number is too long.", 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError("Please provide a valid email address.", 400);
    }

    if (typeof password !== "string" || password.length < 12) {
        throw new AppError(
            "Password must contain at least 12 characters.",
            400
        );
    }

    validateRole(role);

    const passwordHash = await hashPassword(password);
    const connection = await pool.getConnection();

    let employeeId;

    try {
        await connection.beginTransaction();

        const [userResult] = await connection.execute(
            `INSERT INTO users
                (full_name, email, phone, password_hash)
             VALUES (?, ?, ?, ?)`,
            [fullName, email, phone, passwordHash]
        );

        const userId = userResult.insertId;

        const [employeeResult] = await connection.execute(
            `INSERT INTO employees
                (business_id, user_id, role, status, hired_at)
             VALUES (?, ?, ?, 'active', CURRENT_DATE())`,
            [businessId, userId, role]
        );

        employeeId = employeeResult.insertId;

        await connection.commit();

    } catch (error) {
        await connection.rollback();

        if (error.code === "ER_DUP_ENTRY") {
            throw new AppError(
                "This email address or phone number is already registered.",
                409
            );
        }

        throw error;

    } finally {
        connection.release();
    }

    return await getEmployeeRecord(businessId, employeeId);
}

async function updateEmployee(
    businessId,
    employeeId,
    data = {},
    currentEmployeeId
) {
    businessId = validateId(businessId, "business ID");
    employeeId = validateId(employeeId, "employee ID");

    const roleProvided = Object.prototype.hasOwnProperty.call(data, "role");
    const statusProvided = Object.prototype.hasOwnProperty.call(data, "status");

    if (!roleProvided && !statusProvided) {
        throw new AppError(
            "Provide an employee role or status to update.",
            400
        );
    }

    if (roleProvided) {
        validateRole(data.role);
    }

    if (statusProvided && !ALLOWED_STATUSES.includes(data.status)) {
        throw new AppError("Invalid employee status.", 400);
    }

    if (Number(employeeId) === Number(currentEmployeeId) &&
        statusProvided && data.status === "inactive") {
        throw new AppError(
            "You cannot deactivate your own business membership.",
            400
        );
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT employee_id, role, status
             FROM employees
             WHERE business_id = ?
               AND employee_id = ?
             FOR UPDATE`,
            [businessId, employeeId]
        );

        if (rows.length === 0) {
            throw new AppError("Employee not found.", 404);
        }

        if (rows[0].role === "owner") {
            throw new AppError(
                "The business owner's membership cannot be changed here.",
                403
            );
        }

        const updates = [];
        const values = [];

        if (roleProvided) {
            updates.push("role = ?");
            values.push(data.role);
        }

        if (statusProvided) {
            updates.push("status = ?");
            values.push(data.status);
        }

        values.push(businessId, employeeId);

        await connection.execute(
            `UPDATE employees
             SET ${updates.join(", ")}
             WHERE business_id = ?
               AND employee_id = ?`,
            values
        );

        await connection.commit();

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }

    return await getEmployeeRecord(businessId, employeeId);
}

module.exports = {
    getEmployees,
    createEmployee,
    updateEmployee
};
