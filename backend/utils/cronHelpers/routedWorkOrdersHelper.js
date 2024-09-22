import logger from "../../config/logger/winston-logger/loggerConfig.js";
import CronService from '../../services/cronService.js';
import { makeRequest } from "../makeRequest.js";

// Function to get routed work orders
export const getRoutedWorkOrders = async (userId, fnUserId, centerZip, locationRadius, typeOfWorkQueryParams, adminAccessToken) => {
    const routedWorkOrdersUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders?default_view=list&f_=false&f_location_radius[]=${centerZip}&f_location_radius[]=${locationRadius}&list=workorders_routed&sticky=1&view=list&per_page=${process.env.WORKORDERS_PER_PAGE}&f_sc_providers[]=${fnUserId}${typeOfWorkQueryParams}&access_token=${adminAccessToken}`;

    try {
        const response = await makeRequest('GET', routedWorkOrdersUrl, {}, {}, {}, userId);
        if (response && response.metadata && response.metadata.total > 0) {
            logger.info(`ROUTED WORKORDER REQUEST:: ${response.metadata.total} routed work orders found for user id: ${userId}, field nation user id: ${fnUserId}`);
        } else {
            logger.info(`ROUTED WORKORDER REQUEST:: No routed work orders found for user id: ${userId}, field nation user id: ${fnUserId}`);
        }
        return response;
    } catch (error) {
        logger.error(`ROUTED WORKORDER REQUEST:: Failed to get routed work orders for user ${userId}, field nation user id: ${fnUserId} : ${error.message}`);
        return null;
    }
}

export const acceptRoutedWorkOrder = async (workOrderId, cronId, userId, actingUserId, accessToken) => {
    const requestUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders/mass-accept?acting_user_id=${actingUserId}&clientPayTermsAccepted=true&access_token=${accessToken}`;
    const cronService = new CronService(userId);

    try {
        const response = await makeRequest('POST', requestUrl, {}, payload, {}, userId);
        if (response) {
            logger.info(`ACCEPT ROUTED WO:: Routed work order ${workOrderId} successfully accepted by user id: ${userId}, field nation user id: ${actingUserId}`);

            // Update the cron's total requested and requested work order IDs
            await cronService.updateRequestedWorkOrders(cronId, workOrderId);
        }
    } catch (error) {
        logger.error(`ACCEPT ROUTED WO:: Failed to accept routed work order ${workOrderId} for user id: ${userId}, field nation user id: ${actingUserId} : ${error.message}`);
    }
}