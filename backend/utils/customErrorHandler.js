import logger from "../config/logger/winston-logger/loggerConfig.js";

function sanitizeRequestBody(req) {
    const sanitizedBody = { ...req.body };

    if (sanitizedBody.password) {
        sanitizedBody.password = '******';
    }

    return sanitizedBody;
}

const customErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred.';

    const response = {
        status: 'error',
        statusCode,
        message
    };

    const sanitizedBody = sanitizeRequestBody(req);

    // logging all the errors to debug
    logger.error(`HTTP ERROR:: ${req.route?.path}`, {
        request_path: req.route?.path,
        request_payload: sanitizedBody,
        response: response
    });

    res.status(statusCode).json(response);
};

export default customErrorHandler;