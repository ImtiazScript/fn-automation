import cron from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import UserService from '../services/userService.js';
import IntegrationService from '../services/integrationService.js';
import CronService from '../services/cronService.js';
import { makeRequest } from "../utils/integrationHelpers.js";

// Will run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
    // cron.schedule('* * * * *', async () => {
    const currentDateTime = new Date().toLocaleString();
    logger.info(`WORKORDER REQUEST:: Work order finding and requesting cron running at: ${currentDateTime}`);
    const userService = new UserService();
    const users = await userService.fetchAllUsers();

    const adminAccessToken = await userService.getServiceCompanyAdminAccessToken();
    if (!adminAccessToken) {
        logger.error(`WORKORDER REQUEST:: Service company admin is not integrated with FIELD NATION, work order request cron running failed`);
        return;
    }

    users.map(async (user) => {
        // silently avoid, blocked and inactive users
        if (user.blocked || !user.isActive) {
            return;
        }

        // checking integration with Field Nation
        const integrationService = new IntegrationService(user.userId);
        const integration = await integrationService.fetchIntegration();
        if (!integration || !integration.fnUserId || integration.integrationStatus == 'Not Connected' || integration.disabled) {
            logger.info(`WORKORDER REQUEST:: User id: ${user.userId} is not integrated with Field Nation`);
            return;
        }

        // checking configured crons
        const cronService = new CronService(user.userId);
        const crons = await cronService.fetchAllCrons();
        if (crons && !crons.length) {
            logger.info(`WORKORDER REQUEST:: User id: ${user.userId} has no cron configured`);
            return;
        }

        crons.map(async (cron) => {
            const locationRadius = cron.drivingRadius > 1 ? cron.drivingRadius : 50;
            const currentDateTime = new Date();
            const cronStartAt = new Date(cron.cronStartAt);
            const cronEndAt = new Date(cron.cronEndAt);
            const cronCenterZip = cron.centerZip ? cron.centerZip : '';
            const withinCronContractTime = (currentDateTime >= cronStartAt && currentDateTime <= cronEndAt);

            // silently avoid, if a cron is not active or deleted or cron contract ended
            if (cron.status == 'inactive' || cron.deleted || !withinCronContractTime) {
                return;
            }

            // check if cron has configured types of work orders
            if (!cron.typesOfWorkOrder.length) {
                logger.info(`WORKORDER REQUEST:: Cron id: ${cron.cronId} has no configured types of work order`);
                return;
            }

            const typeOfWorkQueryParams = cron.typesOfWorkOrder
                .map(typeId => `&f_type_of_work[]=${encodeURIComponent(typeId)}`)
                .join('');

            // Get available work orders
            const workOrdersResponse = await getAvailableWorkOrders(user.userId, integration.fnUserId, cronCenterZip, locationRadius, typeOfWorkQueryParams, adminAccessToken);

            if (workOrdersResponse && workOrdersResponse.results) {
                workOrdersResponse.results.map((workOrder) => {
                    // DO LOGIC & CONDITIONS TO REQUEST A WORK ORDER
                    // if (workOrder.pay.type == 'hourly' && workOrder.pay.units >= 2) {
                    //     if (typeof workOrder.schedule.exact !== 'undefined') {
                    //         console.log('--- Work order schedule is exact: ', workOrder.schedule);
                    //     }
                    //     if (typeof workOrder.schedule.range !== 'undefined') {
                    //         if (workOrder.schedule.range.type === 'range') {
                    //             console.log('--- Work order schedule is range: ', workOrder.schedule);
                    //         }
                    //         if (workOrder.schedule.range.type === 'business') {
                    //             console.log('--- Work order schedule is business: ', workOrder.schedule);
                    //         }
                    //     }
                    // }

                    // Request work order
                    requestWorkOrders(workOrder.id, cron.cronId, user.userId, integration.fnUserId, adminAccessToken);
                })
            }
        });
    });
});

// Function to get available work orders
async function getAvailableWorkOrders(userId, fnUserId, centerZip, locationRadius, typeOfWorkQueryParams, adminAccessToken) {
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

// Function to request a work order
async function requestWorkOrders(workOrderId, cronId, userId, actingUserId, accessToken) {
    const requestUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders/${workOrderId}/requests?acting_user_id=${actingUserId}&access_token=${accessToken}`;
    const cronService = new CronService(userId);

    try {
        const response = await makeRequest('POST', requestUrl, {}, {}, {}, userId);
        if (response) {
            logger.info(`WORKORDER REQUEST:: Work order ${workOrderId} successfully requested by user id: ${userId}, field nation user id: ${actingUserId}`);

            // Update the cron's total requested and requested work order IDs
            await cronService.updateRequestedWorkOrders(cronId, workOrderId);
        }
    } catch (error) {
        logger.error(`WORKORDER REQUEST:: Failed to request work order ${workOrderId} for user id: ${userId}, field nation user id: ${actingUserId} : ${error.message}`);
    }
}

export default cron;
