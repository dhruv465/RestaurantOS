const config = require('../config/config');

// Bad input that Mongoose catches is the client's fault (400/409), not a server crash (500).
const clientError = (err) => {
    if (err.name === 'ValidationError') return [400, Object.values(err.errors)[0]?.message || 'Invalid data'];
    if (err.name === 'CastError') return [400, `Invalid ${err.path}`];
    if (err.code === 11000) return [409, `That ${Object.keys(err.keyValue || {})[0] || 'value'} already exists`];
    return null;
};

const globalErrorHandler = (err, req, res, next) => {
    const [statusCode, message] = clientError(err) || [err.statusCode || 500, err.message];

    return res.status(statusCode).json({
        status: 'error',
        statusCode: statusCode,
        message,
        stack: config.nodeEnv === "development" ? err.stack : ""
    });
}
module.exports = globalErrorHandler;
// This file is responsible for defining the global error handler middleware function. The globalErrorHandler function takes four parameters: err, req, res, and next. The function logs the error stack trace to the console and sends a 500 Internal Server Error response with the error message in JSON format. The globalErrorHandler function is exported so that it can be used in other files.
