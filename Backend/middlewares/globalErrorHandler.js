const config = require('../config/config');

const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
        status: 'error',
        statusCode: statusCode,
        message: err.message,
        stack: config.nodeEnv === "development" ? err.stack : ""
    });
}
module.exports = globalErrorHandler;
// This file is responsible for defining the global error handler middleware function. The globalErrorHandler function takes four parameters: err, req, res, and next. The function logs the error stack trace to the console and sends a 500 Internal Server Error response with the error message in JSON format. The globalErrorHandler function is exported so that it can be used in other files.
