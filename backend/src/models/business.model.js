// Create a business using a supplied database connection
async function createBusiness(connection, businessData) {
    const [result] = await connection.execute(
        `INSERT INTO businesses
            (business_name, business_type, phone, email, address)
         VALUES (?, ?, ?, ?, ?)`,
        [
            businessData.businessName,
            businessData.businessType || null,
            businessData.phone || null,
            businessData.email || null,
            businessData.address || null
        ]
    );

    return result.insertId;
}

// Find business by ID
async function findById(connection, businessId) {
    const [rows] = await connection.execute(
        `SELECT *
         FROM businesses
         WHERE business_id = ?
         LIMIT 1`,
        [businessId]
    );

    return rows[0] || null;
}

module.exports = {
    createBusiness,
    findById
};