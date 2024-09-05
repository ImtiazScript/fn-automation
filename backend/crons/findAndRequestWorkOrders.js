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
    console.log(`Work order finding and requesting cron running at: ${currentDateTime}`);
    logger.info(`Work order finding and requesting cron running at: ${currentDateTime}`);
    // Add your cron job logic here
    const userService = new UserService();
    const users = await userService.fetchAllUsers();
    users.map(async (user) => {
        const integrationService = new IntegrationService(user.userId);
        if (user.blocked) {
            return;
        }
        const integration = await integrationService.fetchIntegration();
        if (!integration || !integration.fnAccessToken || integration.integrationStatus == 'Not Connected' || integration.disabled) {
            return;
        }
        const cronService = new CronService(user.userId);
        const crons = await cronService.fetchCrons();
        crons.map(async (cron) => {
            const locationRadius = cron.drivingRadius;
            const currentDateTime = new Date();
            const cronStartAt = new Date(cron.cronStartAt);
            const cronEndAt = new Date(cron.cronEndAt);
            const withinCronContractTime =  (currentDateTime >= cronStartAt && currentDateTime <= cronEndAt);
            if (cron.status == 'inactive' || cron.deleted || !withinCronContractTime) {
                return;
            }

            // const url = `https://mono-qa5.fndev.net/v2/workorders?default_view=list&f_=false&f_location_radius[]=${locationRadius}&f_type_of_work[]=95&f_type_of_work[]=178&list=workorders_available&per_page=100&sticky=1&view=list&access_token=${integration.fnAccessToken}`;
            const url = `https://mono-qa5.fndev.net/v2/workorders?default_view=list&f_=false&f_location_radius[]=${locationRadius}&f_type_of_work[]=95&f_type_of_work[]=98&list=workorders_available&per_page=100&sticky=1&view=list&access_token=${integration.fnAccessToken}`;
            const workOrdersResponse = await makeRequest('GET', url, {}, {}, {}, user.userId);

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
