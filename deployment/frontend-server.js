const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const express = require(path.join(
    projectRoot,
    "backend",
    "node_modules",
    "express"
));

const app = express();
const frontendDir = path.join(projectRoot, "frontend");
const port = 5500;

app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "SmartBiz frontend" });
});

// Support old links that include /frontend/
app.use((req, res, next) => {
    if (req.url === "/frontend") {
        req.url = "/";
    } else if (req.url.startsWith("/frontend/")) {
        req.url = req.url.replace(/^\/frontend/, "");
    }
    next();
});

// Open login page at the root URL
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendDir, "login.html"));
});

app.use(express.static(frontendDir));

app.listen(port, "127.0.0.1", () => {
    console.log(`SmartBiz frontend running at http://localhost:${port}`);
});
