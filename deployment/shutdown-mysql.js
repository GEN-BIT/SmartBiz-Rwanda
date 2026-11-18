const path = require("path");
require(path.join(__dirname, "..", "backend", "node_modules", "dotenv"))
    .config({ path: path.join(__dirname, "..", "backend", ".env") });

const mysql = require(path.join(
    __dirname, "..", "backend", "node_modules", "mysql2", "promise"
));

(async () => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || "localhost",
            port: Number(process.env.DB_PORT || 3307),
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASSWORD
        });
        await connection.query("SHUTDOWN");
    } catch (error) {
        if (connection && !/closed|lost connection|fatal/i.test(error.message)) {
            console.error(error.message);
            process.exitCode = 1;
        }
    } finally {
        if (connection) {
            try { await connection.end(); } catch (_) {}
        }
    }
})();
