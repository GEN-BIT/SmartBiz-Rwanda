const pool = require("../config/database");

// Find user by email
async function findByEmail(email) {
    const [rows] = await pool.execute(
        `SELECT *
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0] || null;
}

// Find user by ID
async function findById(userId) {
    const [rows] = await pool.execute(
        `SELECT
            user_id,
            full_name,
            email,
            phone,
            status,
            email_verified,
            last_login,
            created_at
         FROM users
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
    );

    return rows[0] || null;
}

// Create user using a supplied database connection
async function createUser(connection, userData) {
    const [result] = await connection.execute(
        `INSERT INTO users
            (full_name, email, phone, password_hash)
         VALUES (?, ?, ?, ?)`,
        [
            userData.fullName,
            userData.email,
            userData.phone || null,
            userData.passwordHash
        ]
    );

    return result.insertId;
}

// Update last login
async function updateLastLogin(userId) {
    await pool.execute(
        `UPDATE users
         SET last_login = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [userId]
    );
}

module.exports = {
    findByEmail,
    findById,
    createUser,
    updateLastLogin
};