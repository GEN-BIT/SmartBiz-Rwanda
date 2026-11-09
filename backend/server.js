
const app = require("./app");
const env = require("./src/config/env");
const pool = require("./src/config/database");

async function startServer() {
    try {
        // Test the MySQL connection before starting Express.
        const connection = await pool.getConnection();

        await connection.ping();
        connection.release();

        console.log("Connected to SmartBiz Rwanda MySQL database!");

        const PORT = env.port;

        app.listen(PORT, () => {
            console.log(`SmartBiz Rwanda server running on port ${PORT}`);
            console.log(`Environment: ${env.nodeEnv}`);
        });

    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
}

startServer();
