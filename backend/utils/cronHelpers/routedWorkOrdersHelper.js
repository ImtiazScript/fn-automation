import logger from "../../config/logger/winston-logger/loggerConfig.js";
import CronService from '../../services/cronService.js';
import { makeRequest } from "../makeRequest.js";


/**
 * Fetches routed work orders for a specified user from the Field Nation API.
 *
 * @async
 * @function getRoutedWorkOrders
 * @param {string} userId - The ID of the user making the request.
 * @param {string} fnUserId - The Field Nation user ID for which to fetch work orders.
 * @param {string} centerZip - The center ZIP code to filter work orders by location.
 * @param {number} locationRadius - The radius (in miles) to search for work orders around the center ZIP code.
 * @param {string} typeOfWorkQueryParams - Additional query parameters for filtering work orders based on type of work.
 * @param {string} adminAccessToken - The access token for authenticating the request.
 * @returns {Promise<Object|null>} A promise that resolves to the response containing routed work orders, or null if the request fails.
 *
 * @example
 * const routedWorkOrders = await getRoutedWorkOrders(userId, fnUserId, centerZip, locationRadius, typeOfWorkQueryParams, adminAccessToken);
 * if (routedWorkOrders) {
 *     console.log(`Fetched ${routedWorkOrders.metadata.total} routed work orders.`);
 * }
 */
export const getRoutedWorkOrders = async (userId, fnUserId, centerZip, locationRadius, typeOfWorkQueryParams, adminAccessToken) => {
    const routedWorkOrdersUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders?default_view=list&f_=false&f_location_radius[]=${centerZip}&f_location_radius[]=${locationRadius}&list=workorders_routed&sticky=1&view=list&per_page=${process.env.WORKORDERS_PER_PAGE}&f_sc_providers[]=${fnUserId}${typeOfWorkQueryParams}&access_token=${adminAccessToken}`;

    try {
        const response = await makeRequest('GET', routedWorkOrdersUrl, {}, {}, {}, userId);
        if (response && response.metadata && response.metadata.total > 0) {
            logger.info(`${response.metadata.total} routed work orders found for user id: ${userId}, field nation user id: ${fnUserId}`, {cron: 'routedWorkOrders'});
        } else {
            logger.info(`No routed work orders found for user id: ${userId}, field nation user id: ${fnUserId}`, {cron: 'routedWorkOrders'});
        }
        return response;
    } catch (error) {
        logger.error(`Failed to get routed work orders for user ${userId}, field nation user id: ${fnUserId} : ${error.message}`, {cron: 'routedWorkOrders'});
        return null;
    }
}


/**
 * Accepts a routed work order on behalf of a user.
 *
 * @async
 * @function acceptRoutedWorkOrder
 * @param {string} workOrderId - The ID of the work order to be accepted.
 * @param {string} cronId - The ID of the cron job associated with the work order.
 * @param {string} userId - The ID of the user making the request.
 * @param {string} actingUserId - The ID of the user acting on behalf of the original user.
 * @param {string} accessToken - The access token for authenticating the request.
 * @returns {Promise<void>} A promise that resolves when the work order is accepted.
 *
 * @example
 * await acceptRoutedWorkOrder(workOrderId, cronId, userId, actingUserId, accessToken);
 * console.log(`Accepted work order ${workOrderId}.`);
 */
export const acceptRoutedWorkOrder = async (workOrderId, cronId, userId, actingUserId, payload, accessToken) => {
    const requestUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders/mass-accept?acting_user_id=${actingUserId}&clientPayTermsAccepted=true&access_token=${accessToken}`;
    const cronService = new CronService(userId);

    try {
        const response = await makeRequest('POST', requestUrl, {}, payload, {}, userId);
        if (response) {
            logger.info(`Successfully accepted work order #{workOrderId} by user id: ${userId}, field nation user id: ${actingUserId}`, {cron: 'routedWorkOrders'});

            // Update the cron's total requested and requested work order IDs
            await cronService.updateRequestedWorkOrders(cronId, workOrderId);
        }
    } catch (error) {
        logger.error(`Failed to accept routed work order ${workOrderId} for user id: ${userId}, field nation user id: ${actingUserId} : ${error.message}`, {cron: 'routedWorkOrders'});
    }
}

export const getAcceptRoutedWorkOrderPayload = async(workOrder, actingUserId) => {
    const payload = {
        eta: [
            {
                work_order_id: workOrder.id,
                bundle_id: workOrder.bundle?.id,
                user: {
                    id: actingUserId
                },
                hour_estimate: workOrder.schedule?.est_labor_hours,
                notes: "",
                has_require_gps_action: true,
                require_gps: workOrder.require_gps,
                require_ontime: workOrder.require_ontime,
                schedule: workOrder.schedule,
                start: {
                    local: {
                        date: workOrder.schedule?.service_window?.start?.local?.date,
                        time: workOrder.schedule?.service_window?.start?.local?.time
                    },
                    utc: null
                }
            }
        ]
    };

    return payload;
}