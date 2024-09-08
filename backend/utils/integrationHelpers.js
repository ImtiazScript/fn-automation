import axios, {isCancel, AxiosError} from 'axios';
import logger from "../config/logger/winston-logger/loggerConfig.js";

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
        logger.error(`Error making request, error: ${JSON.stringify(error?.response?.data)}, User Id: ${userId}`);
        return false;
    }
};

export { makeRequest };
