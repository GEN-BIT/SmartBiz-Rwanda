/*
 * SmartBiz Rwanda - Cash Register Service
 * Handles opening, viewing, closing and tracking cash registers.
 */

const pool = require("../config/database");
const AppError = require("../utils/AppError");

// Convert money into integer cents.
function toCents(value, fieldName) {
    const text = String(value ?? "0");

    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
        throw new AppError(
            `${fieldName} must be a valid amount with up to 2 decimal places.`,
            400
        );
    }

    const [whole, decimal = ""] = text.split(".");
    const amount = Number(whole) * 100 +
        Number(decimal.padEnd(2, "0"));

    if (!Number.isSafeInteger(amount)) {
        throw new AppError(`${fieldName} is too large.`, 400);
    }

    return amount;
}

function fromCents(value) {
    return (value / 100).toFixed(2);
}

function parseId(value, fieldName) {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} is invalid.`, 400);
    }

    return id;
}

function canManageAllRegisters(role) {
    return role === "owner" || role === "manager";
}

function checkRegisterOwnership(register, employeeId, role) {
    if (
        !canManageAllRegisters(role) &&
        Number(register.employee_id) !== Number(employeeId)
    ) {
        throw new AppError(
            "You do not have permission to access this cash register.",
            403
        );
    }
}

/*
 * Calculate net cash payments recorded against a register.
 *
 * Cash sale payments increase the expected balance.
 * Cash refunds reduce the expected balance.
 * Non-cash payments are excluded.
 */
async function getCashMovements(executor, businessId, registerId) {
    const [rows] = await executor.execute(
        `SELECT
            COALESCE(
                SUM(
                    CASE
                        WHEN p.payment_type = 'sale_payment'
                             AND p.payment_method = 'cash'
                            THEN p.amount

                        WHEN p.payment_type = 'refund'
                             AND p.payment_method = 'cash'
                            THEN -p.amount

                        ELSE 0
                    END
                ),
                0
            ) AS net_cash
         FROM payments p
         INNER JOIN sales s
            ON s.business_id = p.business_id
            AND s.sale_id = p.sale_id
         WHERE s.business_id = ?
           AND s.register_id = ?`,
        [businessId, registerId]
    );

    return toCents(rows[0].net_cash, "Cash movements");
}

/*
 * Open a new cash register for the authenticated employee.
 */
async function openRegister(businessId, employeeId, data = {}) {
    const connection = await pool.getConnection();

    try {
        const openingBalanceCents = toCents(
            data.opening_balance ?? "0",
            "Opening balance"
        );

        await connection.beginTransaction();

        // Lock the employee row to prevent simultaneous register openings.
        const [employees] = await connection.execute(
            `SELECT employee_id
             FROM employees
             WHERE business_id = ?
               AND employee_id = ?
               AND status = 'active'
             FOR UPDATE`,
            [businessId, employeeId]
        );

        if (!employees.length) {
            throw new AppError("Active employee not found.", 404);
        }

        // An employee may only have one open register at a time.
        const [existingRegisters] = await connection.execute(
            `SELECT register_id
             FROM cash_registers
             WHERE business_id = ?
               AND employee_id = ?
               AND status = 'open'
             LIMIT 1`,
            [businessId, employeeId]
        );

        if (existingRegisters.length) {
            throw new AppError(
                "You already have an open cash register. Close it before opening another.",
                409
            );
        }

        const notes = data.notes
            ? String(data.notes).trim().slice(0, 255)
            : null;

        const [result] = await connection.execute(
            `INSERT INTO cash_registers (
                business_id,
                employee_id,
                opening_balance,
                notes
            ) VALUES (?, ?, ?, ?)`,
            [
                businessId,
                employeeId,
                fromCents(openingBalanceCents),
                notes
            ]
        );

        await connection.commit();

        return {
            register_id: result.insertId,
            business_id: businessId,
            employee_id: employeeId,
            opening_balance: fromCents(openingBalanceCents),
            closing_balance: null,
            expected_balance: null,
            difference: null,
            status: "open"
        };

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
}

/*
 * Get the authenticated employee's current open register.
 */
async function getCurrentRegister(businessId, employeeId) {
    const [rows] = await pool.execute(
        `SELECT *
         FROM cash_registers
         WHERE business_id = ?
           AND employee_id = ?
           AND status = 'open'
         ORDER BY opened_at DESC
         LIMIT 1`,
        [businessId, employeeId]
    );

    if (!rows.length) {
        return null;
    }

    const register = rows[0];

    const cashMovements = await getCashMovements(
        pool,
        businessId,
        register.register_id
    );

    const openingBalance = toCents(
        register.opening_balance,
        "Opening balance"
    );

    return {
        ...register,
        cash_movements: fromCents(cashMovements),
        expected_balance: fromCents(
            openingBalance + cashMovements
        )
    };
}

/*
 * Get one register by its ID.
 */
async function getRegisterById(
    businessId,
    registerId,
    employeeId,
    role
) {
    registerId = parseId(registerId, "Register ID");

    const [rows] = await pool.execute(
        `SELECT
            cr.*,
            e.employee_id,
            u.full_name AS employee_name
         FROM cash_registers cr
         INNER JOIN employees e
            ON e.business_id = cr.business_id
            AND e.employee_id = cr.employee_id
         INNER JOIN users u
            ON u.user_id = e.user_id
         WHERE cr.business_id = ?
           AND cr.register_id = ?
         LIMIT 1`,
        [businessId, registerId]
    );

    if (!rows.length) {
        throw new AppError("Cash register not found.", 404);
    }

    const register = rows[0];

    checkRegisterOwnership(register, employeeId, role);

    const cashMovements = await getCashMovements(
        pool,
        businessId,
        registerId
    );

    const openingBalance = toCents(
        register.opening_balance,
        "Opening balance"
    );

    const calculatedExpected = openingBalance + cashMovements;

    return {
        ...register,
        cash_movements: fromCents(cashMovements),
        expected_balance: register.status === "closed"
            ? register.expected_balance
            : fromCents(calculatedExpected)
    };
}

/*
 * Get cash register history.
 *
 * Owners and managers can view all registers.
 * Cashiers can only view their own registers.
 */
async function getRegisterHistory(
    businessId,
    employeeId,
    role,
    filters = {}
) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(
        100,
        Math.max(1, parseInt(filters.limit, 10) || 20)
    );

    const offset = (page - 1) * limit;

    const conditions = ["cr.business_id = ?"];
    const params = [businessId];

    if (!canManageAllRegisters(role)) {
        conditions.push("cr.employee_id = ?");
        params.push(employeeId);
    }

    if (filters.status) {
        if (!["open", "closed"].includes(filters.status)) {
            throw new AppError("Invalid register status filter.", 400);
        }

        conditions.push("cr.status = ?");
        params.push(filters.status);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM cash_registers cr
         WHERE ${whereClause}`,
        params
    );

    const [rows] = await pool.execute(
        `SELECT
            cr.*,
            u.full_name AS employee_name,
            COALESCE(
                (
                    SELECT SUM(
                        CASE
                            WHEN p.payment_type = 'sale_payment'
                                 AND p.payment_method = 'cash'
                                THEN p.amount

                            WHEN p.payment_type = 'refund'
                                 AND p.payment_method = 'cash'
                                THEN -p.amount

                            ELSE 0
                        END
                    )
                    FROM payments p
                    INNER JOIN sales s
                        ON s.business_id = p.business_id
                        AND s.sale_id = p.sale_id
                    WHERE s.business_id = cr.business_id
                      AND s.register_id = cr.register_id
                ),
                0
            ) AS cash_movements
         FROM cash_registers cr
         INNER JOIN employees e
            ON e.business_id = cr.business_id
            AND e.employee_id = cr.employee_id
         INNER JOIN users u
            ON u.user_id = e.user_id
         WHERE ${whereClause}
         ORDER BY cr.opened_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const registers = rows.map(register => {
        const openingBalance = toCents(
            register.opening_balance,
            "Opening balance"
        );

        const cashMovements = toCents(
            register.cash_movements,
            "Cash movements"
        );

        return {
            ...register,
            expected_balance: register.status === "closed"
                ? register.expected_balance
                : fromCents(openingBalance + cashMovements)
        };
    });

    const total = Number(countRows[0].total);

    return {
        data: registers,
        pagination: {
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit)
        }
    };
}

/*
 * Close an open register and calculate its cash difference.
 */
async function closeRegister(
    businessId,
    registerId,
    employeeId,
    role,
    data = {}
) {
    registerId = parseId(registerId, "Register ID");

    const closingBalanceCents = toCents(
        data.closing_balance,
        "Closing balance"
    );

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT *
             FROM cash_registers
             WHERE business_id = ?
               AND register_id = ?
             LIMIT 1
             FOR UPDATE`,
            [businessId, registerId]
        );

        if (!rows.length) {
            throw new AppError("Cash register not found.", 404);
        }

        const register = rows[0];

        checkRegisterOwnership(register, employeeId, role);

        if (register.status !== "open") {
            throw new AppError(
                "This cash register has already been closed.",
                409
            );
        }

        const openingBalanceCents = toCents(
            register.opening_balance,
            "Opening balance"
        );

        const cashMovementsCents = await getCashMovements(
            connection,
            businessId,
            registerId
        );

        const expectedBalanceCents =
            openingBalanceCents + cashMovementsCents;

        const differenceCents =
            closingBalanceCents - expectedBalanceCents;

        const notes = data.notes
            ? String(data.notes).trim().slice(0, 255)
            : register.notes;

        await connection.execute(
            `UPDATE cash_registers
             SET
                closing_balance = ?,
                expected_balance = ?,
                difference = ?,
                closed_at = CURRENT_TIMESTAMP,
                status = 'closed',
                notes = ?
             WHERE business_id = ?
               AND register_id = ?`,
            [
                fromCents(closingBalanceCents),
                fromCents(expectedBalanceCents),
                fromCents(differenceCents),
                notes,
                businessId,
                registerId
            ]
        );

        await connection.commit();

        return {
            register_id: registerId,
            opening_balance: fromCents(openingBalanceCents),
            cash_movements: fromCents(cashMovementsCents),
            expected_balance: fromCents(expectedBalanceCents),
            closing_balance: fromCents(closingBalanceCents),
            difference: fromCents(differenceCents),
            status: "closed"
        };

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
}

module.exports = {
    openRegister,
    getCurrentRegister,
    getRegisterById,
    getRegisterHistory,
    closeRegister
};