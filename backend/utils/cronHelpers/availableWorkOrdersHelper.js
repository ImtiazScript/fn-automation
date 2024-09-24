import logger from "../../config/logger/winston-logger/loggerConfig.js";
import { makeRequest } from "../makeRequest.js";


/**
 * Fetches available work orders based on user location and work type from the Field Nation API.
 *
 * @async
 * @function getAvailableWorkOrders
 * @param {string} userId - The ID of the user requesting the work orders.
 * @param {string} fnUserId - The Field Nation user ID for filtering work orders.
 * @param {string} centerZip - The zip code for the center of the search location.
 * @param {number} locationRadius - The radius around the center zip for searching work orders (in miles).
 * @param {string} typeOfWorkQueryParams - Query parameters for filtering work orders by type.
 * @param {string} adminAccessToken - The access token for authenticating API requests.
 * @returns {Promise<Object|null>} A promise that resolves to the response object containing available work orders, or null if an error occurs.
 *
 * @example
 * const workOrders = await getAvailableWorkOrders(userId, fnUserId, centerZip, locationRadius, typeOfWorkQueryParams, adminAccessToken);
 * console.log(workOrders);
 */
export const getAvailableWorkOrders = async (userId, fnUserId, centerZip, locationRadius, typeOfWorkQueryParams, adminAccessToken) => {
    const availableWorkOrdersUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders?default_view=list&f_=false&f_location_radius[]=${centerZip}&f_location_radius[]=${locationRadius}&list=workorders_available&sticky=1&view=list&per_page=${process.env.WORKORDERS_PER_PAGE}&f_sc_providers[]=${fnUserId}${typeOfWorkQueryParams}&access_token=${adminAccessToken}`;

    try {
        const response = await makeRequest('GET', availableWorkOrdersUrl, {}, {}, {}, userId);
        if (response && response.metadata && response.metadata.total > 0) {
            logger.info(`${response.metadata.total} available work orders found for user id: ${userId}, field nation user id: ${fnUserId}`, {cron: 'availableWorkOrders'});
        } else {
            logger.info(`No available work orders found for user id: ${userId}, field nation user id: ${fnUserId}`, {cron: 'availableWorkOrders'});
        }
        return response;
    } catch (error) {
        logger.error(`Failed to get available work orders for user ${userId}, field nation user id: ${fnUserId} : ${error.message}`, {cron: 'availableWorkOrders'});
        return null;
    }
}