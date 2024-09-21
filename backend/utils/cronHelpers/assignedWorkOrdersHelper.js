import logger from "../../config/logger/winston-logger/loggerConfig.js";
import { makeRequest } from "../makeRequest.js";


// Function to get available work orders
export const getAssignedWorkOrders = async (userId, fnUserId, adminAccessToken) => {
    const assignedWorkOrdersUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders?default_view=list&f_=false&list=workorders_assignments&sticky=1&view=list&per_page=${process.env.WORKORDERS_PER_PAGE}&f_sc_providers[]=${fnUserId}&access_token=${adminAccessToken}`;

    try {
        const response = await makeRequest('GET', assignedWorkOrdersUrl, {}, {}, {}, userId);
        if (response && response.metadata && response.metadata.total > 0) {
            logger.info(`GET ASSIGNED WORKORDERS:: ${response.metadata.total} assigned work orders found for user id: ${userId}, field nation user id: ${fnUserId}`);
        } else {
            logger.info(`GET ASSIGNED WORKORDERS:: No assigned work orders found for user id: ${userId}, field nation user id: ${fnUserId}`);
        }
        return response;
    } catch (error) {
        logger.error(`GET ASSIGNED WORKORDERS:: Failed to get assigned work orders for user ${userId}, field nation user id: ${fnUserId} : ${error.message}`);
        return null;
    }
}