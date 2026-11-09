function errorHandler(err, req, res, next) {
    console.error(err.stack);

    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
        status: "error",
        message: statusCode === 500
            ? "Internal server error"
            : err.message
    });
}

module.exports = errorHandler;