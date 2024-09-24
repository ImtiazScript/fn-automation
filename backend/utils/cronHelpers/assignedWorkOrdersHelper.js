import logger from "../../config/logger/winston-logger/loggerConfig.js";
import { makeRequest } from "../makeRequest.js";


/**
 * Fetches available work orders assigned to a user from the Field Nation API.
 *
 * @async
 * @function getAssignedWorkOrders
 * @param {string} userId - The ID of the user requesting the work orders.
 * @param {string} fnUserId - The Field Nation user ID for filtering work orders.
 * @param {string} adminAccessToken - The access token for authenticating API requests.
 * @returns {Promise<Object|null>} A promise that resolves to the response object containing assigned work orders, or null if an error occurs.
 *
 * @example
 * const workOrders = await getAssignedWorkOrders(userId, fnUserId, adminAccessToken);
 * console.log(workOrders);
 */
export const getAssignedWorkOrders = async (userId, fnUserId, adminAccessToken) => {
    const assignedWorkOrdersUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders?default_view=list&f_=false&list=workorders_assignments&sticky=1&view=list&per_page=${process.env.WORKORDERS_PER_PAGE}&f_sc_providers[]=${fnUserId}&access_token=${adminAccessToken}`;

    try {
        const response = await makeRequest('GET', assignedWorkOrdersUrl, {}, {}, {}, userId);
        if (response && response.metadata && response.metadata.total > 0) {
            logger.info(`${response.metadata.total} assigned work orders found for user id: ${userId}, field nation user id: ${fnUserId}`, {cron: 'getAssignedWorkOrders'});
        } else {
            logger.info(`No assigned work orders found for user id: ${userId}, field nation user id: ${fnUserId}`, {cron: 'getAssignedWorkOrders'});
        }
        return response;
    } catch (error) {
        logger.error(`Failed to get assigned work orders for user ${userId}, field nation user id: ${fnUserId} : ${error.message}`, {cron: 'getAssignedWorkOrders'});
        return null;
    }
}