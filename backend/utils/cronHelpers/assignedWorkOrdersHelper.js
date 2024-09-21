import logger from "../../config/logger/winston-logger/loggerConfig.js";
import AssignedWorkOrders from '../../models/assignedWorkOrdersModel.js';
import { makeRequest } from "../makeRequest.js";
import moment from 'moment-timezone';


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

// Function to process work orders (insert or update)
export const processAssignedWorkOrder = async (userId, workOrder) => {
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
                    updatedAt: moment.utc().toDate(),
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
export const deleteOutdatedWorkOrders = async (userId, currentlyAssignedWorkOrderIds) => {
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