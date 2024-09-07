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
        const crons = await cronService.fetchCrons();
        if (crons && !crons.length) {
            logger.info(`WORKORDER REQUEST:: User id: ${user.userId} has no cron configured`);
            return;
        }

        crons.map(async (cron) => {
            const locationRadius = cron.drivingRadius > 1 ? cron.drivingRadius : 50;
            const currentDateTime = new Date();
            const cronStartAt = new Date(cron.cronStartAt);
            const cronEndAt = new Date(cron.cronEndAt);
            const withinCronContractTime =  (currentDateTime >= cronStartAt && currentDateTime <= cronEndAt);

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

            // Config available work orders url
            const workordersAvailableUrl = `${process.env.FN_BASE_URL}/v2/workorders?default_view=list&f_=false&list=workorders_available&sticky=1&view=list&f_location_radius[]=${locationRadius}&per_page=${process.env.WORKORDERS_PER_PAGE}${typeOfWorkQueryParams}&access_token=${adminAccessToken}`;

            // Get available work orders response
            const workOrdersResponse = await makeRequest('GET', workordersAvailableUrl, {}, {}, {}, user.userId);

            if (workOrdersResponse) {
                console.log('------ Total number of work orders:', workOrdersResponse.total);
                workOrdersResponse.results.map((workOrder) => {
                    console.log(`------ workOrderId: ${workOrder.id}`);
                    if (workOrder.pay.type == 'hourly' && workOrder.pay.units >= 2) {
                        if (typeof workOrder.schedule.exact !== 'undefined') {
                            console.log('--- Work order schedule is exact: ', workOrder.schedule);
                        }
                        if (typeof workOrder.schedule.range !== 'undefined') {
                            if (workOrder.schedule.range.type === 'range') {
                                console.log('--- Work order schedule is range: ', workOrder.schedule);
                            }
                            if (workOrder.schedule.range.type === 'business') {
                                console.log('--- Work order schedule is business: ', workOrder.schedule);
                            }
                        }
                    }
                })
            }
        });
    });
});

export default cron;
