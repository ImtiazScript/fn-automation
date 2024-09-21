import cron from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import UserService from '../services/userService.js';
import IntegrationService from '../services/integrationService.js';
import CronService from '../services/cronService.js';
import { getAssignedWorkOrders, processAssignedWorkOrder, deleteOutdatedWorkOrders } from '../utils/cronHelpers/assignedWorkOrdersHelper.js';
import moment from 'moment-timezone';

// Will run every 30 minutes
cron.schedule('*/57 * * * *', async () => {
    if(process.env.DISABLED_CRONS === 'true') {
        return;
    }
    // cron.schedule('* * * * *', async () => {
    const currentDateTime = moment.utc().toDate().toLocaleString();
    logger.info(`GET ASSIGNED WORKORDERS:: cron running at: ${currentDateTime}`);
    const userService = new UserService();
    const users = await userService.fetchAllUsers();

    const adminAccessToken = await userService.getServiceCompanyAdminAccessToken();
    if (!adminAccessToken) {
        logger.error(`GET ASSIGNED WORKORDERS:: Service company admin is not integrated with FIELD NATION, work order request cron running failed`);
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
        // silently avoid, not integrated user
        if (!integration || !integration.fnUserId || integration.integrationStatus == 'Not Connected' || integration.disabled) {
            // logger.info(`GET ASSIGNED WORKORDERS:: User id: ${user.userId} is not integrated with Field Nation`);
            return;
        }

        // checking configured crons
        const cronService = new CronService(user.userId);
        const crons = await cronService.fetchAllCrons();
        if (crons && !crons.length) {
            // logger.info(`GET ASSIGNED WORKORDERS:: User id: ${user.userId} has no cron configured, not looking for assigned work orders`);
            return;
        }

        // Get available work orders
        const workOrdersResponse = await getAssignedWorkOrders(user.userId, integration.fnUserId, adminAccessToken);

        if (workOrdersResponse && workOrdersResponse.results) {
            const currentlyAssignedWorkOrderIds = workOrdersResponse.results.map(workOrder => workOrder.id);
        
            for (const workOrder of workOrdersResponse.results) {
                // Inser or update to assignedWorkOrders Collection
                await processAssignedWorkOrder(user.userId, workOrder);
            }
        
            // Call the new function to delete outdated work orders
            await deleteOutdatedWorkOrders(user.userId, currentlyAssignedWorkOrderIds);
        }
        


    });
});

export default cron;
