const appConfig = {
    apiPrefix: "/api/v1",

    corsOrigin: process.env.FRONTEND_URL || "http://localhost:5500",

    jsonLimit: "1mb"
};

module.exports = appConfig;