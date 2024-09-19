import cron, { schedule } from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import UserService from '../services/userService.js';
import IntegrationService from '../services/integrationService.js';
import CronService from '../services/cronService.js';
import AssignedWorkOrders from '../models/assignedWorkOrdersModel.js';
import { makeRequest } from "../utils/integrationHelpers.js";

// Will run every 30 minutes
cron.schedule('*/57 * * * *', async () => {
    if(process.env.DISABLED_CRONS === 'true') {
        return;
    }
    // cron.schedule('* * * * *', async () => {
    const currentDateTime = new Date().toLocaleString();
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

// Function to get available work orders
async function getAssignedWorkOrders(userId, fnUserId, adminAccessToken) {
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

// Function to process work orders (insert or update)
async function processAssignedWorkOrder(userId, workOrder) {
    try {
        const existingWorkOrder = await AssignedWorkOrders.findOne({ workOrderId: workOrder.id });

        if (existingWorkOrder) {
            // Update existing work order
            await AssignedWorkOrders.updateOne(
                { workOrderId: workOrder.id },
                {
                    schedule: workOrder.schedule,
                    pay: workOrder.pay,
                    eta: workOrder.eta,
                    assignee: workOrder.eta,
                    updatedAt: new Date()
                }
            );
            logger.info(`GET ASSIGNED WORKORDERS:: Updated Assigned Work Order, #ID: ${workOrder.id}, Title: ${workOrder.title}`);
        } else {
            // Insert new work order
            await AssignedWorkOrders.create({
                userId: userId,
                workOrderId: workOrder.id,
                schedule: workOrder.schedule,
                pay: workOrder.pay,
                eta: workOrder.eta,
                assignee: workOrder.eta,
            });
            logger.info(`GET ASSIGNED WORKORDERS:: Inserted new Assigned Work Order, #ID: ${workOrder.id}, Title: ${workOrder.title}`, {
                userId: userId,
                workOrderId: workOrder.id,
                schedule: workOrder.schedule,
                pay: workOrder.pay,
                eta: workOrder.eta,
                assignee: workOrder.eta,
            });
        }
    } catch (error) {
        logger.error(`GET ASSIGNED WORKORDERS:: Failed to process work order #ID: ${workOrder.id} for user ${userId}: ${error.message}`);
    }
}


// Function to delete outdated work orders
async function deleteOutdatedWorkOrders(userId, currentlyAssignedWorkOrderIds) {
    try {
        // Delete work orders from the database that are not in the API response
        const deleteResult = await AssignedWorkOrders.deleteMany({
            userId: userId,
            workOrderId: { $nin: currentlyAssignedWorkOrderIds }
        });

        // Log only if any documents were deleted
        if (deleteResult.deletedCount > 0) {
            logger.info(`GET ASSIGNED WORKORDERS:: Deleted ${deleteResult.deletedCount} work orders not present in the API response for user id: ${userId}`);
        }
    } catch (error) {
        logger.error(`GET ASSIGNED WORKORDERS:: Failed to delete outdated work orders for user ${userId}: ${error.message}`);
    }
}

export default cron;
