import logger from "../config/logger/winston-logger/loggerConfig.js";


/**
 * Sanitizes the request body by masking sensitive information such as passwords.
 *
 * @function sanitizeRequestBody
 * @param {Object} req - The request object containing the body to sanitize.
 * @returns {Object} A new object representing the sanitized request body.
 *
 * @example
 * const sanitizedBody = sanitizeRequestBody(req);
 * console.log(sanitizedBody); // Outputs the sanitized body, with the password masked.
 */
function sanitizeRequestBody(req) {
    const sanitizedBody = { ...req.body };

    if (sanitizedBody.password) {
        sanitizedBody.password = '******';
    }

    return sanitizedBody;
}


/**
 * Custom error handler middleware for Express applications.
 *
 * This middleware captures errors, logs them, and sends a standardized JSON response to the client.
 *
 * @function customErrorHandler
 * @param {Error} err - The error object that was thrown.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function in the stack.
 *
 * @returns {void} Sends a JSON response with the error details.
 *
 * @example
 * app.use(customErrorHandler);
 */
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