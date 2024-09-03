import axios, {isCancel, AxiosError} from 'axios';

const makeRequest = async (method, url, headers = {}, data = {}, params = {}) => {
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
        console.error('Error making request:', error.message);
        throw error;
    }
};

export { makeRequest };
