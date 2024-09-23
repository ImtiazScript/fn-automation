import axios, { isCancel, AxiosError } from 'axios';
import logger from "../config/logger/winston-logger/loggerConfig.js";


/**
 * Makes an HTTP request using Axios.
 *
 * This function handles various HTTP methods and logs errors if the request fails.
 *
 * @function makeRequest
 * @param {string} method - The HTTP method to use (e.g., 'GET', 'POST').
 * @param {string} url - The URL for the request.
 * @param {Object} [headers={}] - Optional headers to include in the request.
 * @param {Object} [data={}] - Optional data to send with the request (for methods like POST).
 * @param {Object} [params={}] - Optional URL parameters to include in the request.
 * @param {number} [userId=0] - Optional user ID for logging purposes.
 *
 * @returns {Promise<Object|boolean>} The response data if the request is successful, or false if it fails.
 *
 * @example
 * const data = await makeRequest('GET', 'https://api.example.com/data');
 * if (!data) {
 *     console.error('Request failed');
 * }
 */
const makeRequest = async (method, url, headers = {}, data = {}, params = {}, userId = 0) => {
    try {
        const options = {
            method,
            url,
            headers,
            data,
            params,
        };
        const response = await axios(options);
        return response.data;
    } catch (error) {
        logger.error(`Error making request, error: ${JSON.stringify(error?.response?.data)}`, {userId: userId, url: url, payload: data});
        return false;
    }
};

export { makeRequest };
