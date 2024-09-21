import logger from "../../config/logger/winston-logger/loggerConfig.js";
import { makeRequest } from "../makeRequest.js";

// Function to get available work orders
export const getAvailableWorkOrders = async (userId, fnUserId, centerZip, locationRadius, typeOfWorkQueryParams, adminAccessToken) => {
    const availableWorkOrdersUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders?default_view=list&f_=false&f_location_radius[]=${centerZip}&f_location_radius[]=${locationRadius}&list=workorders_available&sticky=1&view=list&per_page=${process.env.WORKORDERS_PER_PAGE}&f_sc_providers[]=${fnUserId}${typeOfWorkQueryParams}&access_token=${adminAccessToken}`;

    try {
        const response = await makeRequest('GET', availableWorkOrdersUrl, {}, {}, {}, userId);
        if (response && response.metadata && response.metadata.total > 0) {
            logger.info(`WORKORDER REQUEST:: ${response.metadata.total} available work orders found for user id: ${userId}, field nation user id: ${fnUserId}`);
        } else {
            logger.info(`WORKORDER REQUEST:: No available work orders found for user id: ${userId}, field nation user id: ${fnUserId}`);
        }
        return response;
    } catch (error) {
        logger.error(`WORKORDER REQUEST:: Failed to get available work orders for user ${userId}, field nation user id: ${fnUserId} : ${error.message}`);
        return null;
    }
}