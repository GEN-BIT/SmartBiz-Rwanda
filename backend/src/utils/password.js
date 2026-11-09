const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

// Hash a password
async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

// Compare password with stored hash
async function comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

module.exports = {
    hashPassword,
    comparePassword
};