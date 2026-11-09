
const pool = require("../config/database");
const userModel = require("../models/user.model");
const businessModel = require("../models/business.model");
const { hashPassword, comparePassword } = require("../utils/password");
const AppError = require("../utils/AppError");
const jwt = require("jsonwebtoken");

// Create an authentication token
function generateToken(user) {
    if (!process.env.JWT_SECRET ||
        process.env.JWT_SECRET === "YOUR_LONG_RANDOM_SECRET_HERE") {
        throw new Error("JWT_SECRET is not configured.");
    }

    return jwt.sign(
        {
            sub: String(user.user_id),
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1h"
        }
    );
}

// Register a new business owner
async function register(data) {
    const fullName = data.fullName?.trim();
    const email = data.email?.trim().toLowerCase();
    const businessName = data.businessName?.trim();
    const password = data.password;

    if (!fullName || !email || !businessName || !password) {
        throw new AppError(
            "Full name, email, password and business name are required.",
            400
        );
    }

    if (password.length < 12) {
        throw new AppError(
            "Password must contain at least 12 characters.",
            400
        );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        throw new AppError("Please provide a valid email address.", 400);
    }

    // Hash password before opening the transaction
    const passwordHash = await hashPassword(password);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Create user
        const userId = await userModel.createUser(connection, {
            fullName,
            email,
            phone: data.phone,
            passwordHash
        });

        // 2. Create business
        const businessId = await businessModel.createBusiness(
            connection,
            {
                businessName,
                businessType: data.businessType,
                phone: data.businessPhone,
                email: data.businessEmail,
                address: data.address
            }
        );

        // 3. Connect user to business as owner
        await connection.execute(
            `INSERT INTO employees
                (business_id, user_id, role, status)
             VALUES (?, ?, 'owner', 'active')`,
            [businessId, userId]
        );

        // Save all three records together
        await connection.commit();

        return {
            user: {
                userId,
                fullName,
                email
            },
            business: {
                businessId,
                businessName,
                status: "pending"
            },
            message: "Registration successful. Your business is awaiting approval."
        };

    } catch (error) {
        await connection.rollback();

        if (error.code === "ER_DUP_ENTRY") {
            throw new AppError(
                "This email or phone number is already registered.",
                409
            );
        }

        throw error;

    } finally {
        connection.release();
    }
}

// Log in an existing user
async function login(data) {
    const email = data.email?.trim().toLowerCase();
    const password = data.password;

    if (!email || !password) {
        throw new AppError(
            "Email and password are required.",
            400
        );
    }

    // Find account
    const user = await userModel.findByEmail(email);

    if (!user) {
        throw new AppError("Invalid email or password.", 401);
    }

    if (user.status !== "active") {
        throw new AppError("Your account is not active.", 403);
    }

    // Verify password
    const passwordMatches = await comparePassword(
        password,
        user.password_hash
    );

    if (!passwordMatches) {
        throw new AppError("Invalid email or password.", 401);
    }

    // Find user's business memberships
    const [memberships] = await pool.execute(
        `SELECT
            e.employee_id,
            e.business_id,
            e.role,
            e.status AS membership_status,
            b.business_name,
            b.status AS business_status
         FROM employees e
         INNER JOIN businesses b
            ON b.business_id = e.business_id
         WHERE e.user_id = ?
           AND e.status = 'active'
         ORDER BY e.employee_id ASC`,
        [user.user_id]
    );

    if (memberships.length === 0) {
        throw new AppError(
            "Your account is not connected to an active business membership.",
            403
        );
    }

    // Update last login
    await userModel.updateLastLogin(user.user_id);

    // Generate JWT
    const token = generateToken(user);

    return {
        user: {
            userId: user.user_id,
            fullName: user.full_name,
            email: user.email
        },
        memberships,
        token,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN || "1h"
    };
}

module.exports = {
    register,
    login
};
