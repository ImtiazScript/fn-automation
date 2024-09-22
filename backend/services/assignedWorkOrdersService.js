import logger from "../config/logger/winston-logger/loggerConfig.js";
import AssignedWorkOrders from '../models/assignedWorkOrdersModel.js';
import moment from 'moment-timezone';

class AssignedWorkOrder {


  /**
   * Fetches all assigned work orders from the database.
   *
   * @async
   * @function fetchAllAssignedWorkOrders
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of assigned work orders.
   * @throws {Error} If there is an error fetching the assigned work orders.
   */
  async fetchAllAssignedWorkOrders() {
    try {
      const assignedWorkOrdersList = await AssignedWorkOrders.find();
      return assignedWorkOrdersList;
    } catch (error) {
      throw new Error('Error fetching assignedWorkOrdersList');
    }
  };


  /**
   * Fetches the schedules of assigned work orders where the service window mode is 'exact' or ETA start date is available.
   *
   * @async
   * @function fetchAssignedWorkOrdersSchedules
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of schedule objects from assigned work orders.
   * @throws {Error} If there is an error fetching the schedules.
   *
   * @example
   * // Example schedule object returned
   * {
   *   work_order_id: Number,
   *   mode: String,
   *   est_labor_hours: Number,
   *   start: {
   *     local: { date: String, time: String },
   *     utc: String
   *   },
   *   end: {
   *     local: { date: String, time: String },
   *     utc: String
   *   },
   *   time_zone: {
   *     id: String,
   *     name: String,
   *     offset: Number,
   *     short: String
   *   }
   * }
   */
  async fetchAssignedWorkOrdersSchedules() {
    try {
      const assignedWorkOrdersSchedules = [];
      const assignedWorkOrdersList = await this.fetchAllAssignedWorkOrders();

      assignedWorkOrdersList.filter((assignedWorkOrder) => assignedWorkOrder.schedule.service_window.mode === 'exact' || assignedWorkOrder.eta.start.local.date)
        .map((assignedWorkOrder) => {
          const schedule = {
            work_order_id: assignedWorkOrder.schedule.work_order_id,
            mode: assignedWorkOrder.schedule.service_window.mode,
            est_labor_hours: assignedWorkOrder?.eta?.hour_estimate ? assignedWorkOrder.eta.hour_estimate : assignedWorkOrder.schedule.est_labor_hours,
            start: {
              local: {
                date: assignedWorkOrder.eta.start.local.date,
                time: assignedWorkOrder.eta.start.local.time
              },
              utc: assignedWorkOrder.eta.start.utc,
            },
            end: {
              local: {
                date: assignedWorkOrder.eta.end.local.date,
                time: assignedWorkOrder.eta.end.local.time,
              },
              utc: assignedWorkOrder.eta.end.utc,
            },
            time_zone: {
              id: assignedWorkOrder.schedule.time_zone.id,
              name: assignedWorkOrder.schedule.time_zone.name,
              offset: assignedWorkOrder.schedule.time_zone.offset,
              short: assignedWorkOrder.schedule.time_zone.short,
            },
          };
          assignedWorkOrdersSchedules.push(schedule);
        });

      return assignedWorkOrdersSchedules;
    } catch (error) {
      throw new Error('Error fetching assignedWorkOrdersSchedules');
    }
  };


  /**
   * Fetches the schedule of an assigned work order by its work order ID.
   *
   * @async
   * @function getAssignedWorkOrderScheduleByWorkOrderId
   * @param {number} workOrderId - The ID of the work order to fetch the schedule for.
   * @returns {Promise<Object>} A promise that resolves to the schedule object of the assigned work order.
   * @throws {Error} If no assigned work order is found or if there is an error fetching the schedule.
   *
   * @example
   * // Example schedule object returned
   * {
   *   work_order_id: Number,
   *   mode: String,
   *   est_labor_hours: Number,
   *   start: {
   *     local: { date: String, time: String },
   *     utc: String
   *   },
   *   end: {
   *     local: { date: String, time: String },
   *     utc: String
   *   },
   *   time_zone: {
   *     id: String,
   *     name: String,
   *     offset: Number,
   *     short: String
   *   }
   * }
   */
  async getAssignedWorkOrderScheduleByWorkOrderId(workOrderId) {
    try {
      const assignedWorkOrder = await AssignedWorkOrders.findOne({ workOrderId: workOrderId });

      // Check if the assignedWorkOrder exists
      if (!assignedWorkOrder) {
        throw new Error(`No assigned work order found for workOrderId: ${workOrderId}`);
      }

      const assignedWorkOrderSchedule = {
        work_order_id: assignedWorkOrder.workOrderId,
        mode: assignedWorkOrder.schedule?.service_window?.mode,
        est_labor_hours: assignedWorkOrder?.eta?.hour_estimate ? assignedWorkOrder.eta.hour_estimate : assignedWorkOrder.schedule.est_labor_hours,
        start: {
          local: {
            date: assignedWorkOrder.eta.start.local.date,
            time: assignedWorkOrder.eta.start.local.time
          },
          utc: assignedWorkOrder.eta.start.utc,
        },
        end: {
          local: {
            date: assignedWorkOrder.eta.end.local.date,
            time: assignedWorkOrder.eta.end.local.time,
          },
          utc: assignedWorkOrder.eta.end.utc,
        },
        time_zone: {
          id: assignedWorkOrder.schedule.time_zone.id,
          name: assignedWorkOrder.schedule.time_zone.name,
          offset: assignedWorkOrder.schedule.time_zone.offset,
          short: assignedWorkOrder.schedule.time_zone.short,
        },
      };

      return assignedWorkOrderSchedule;
    } catch (error) {
      console.log(error);
      throw new Error('Error fetching assignedWorkOrderSchedule');
    }
  };


  /**
   * Processes an assigned work order by inserting a new one or updating an existing one.
   *
   * @async
   * @function processAssignedWorkOrder
   * @param {number} userId - The ID of the user associated with the work order.
   * @param {Object} workOrder - The work order data to process.
   * @param {number} workOrder.id - The ID of the work order.
   * @param {Object} workOrder.schedule - The schedule information for the work order.
   * @param {Object} workOrder.pay - The payment information for the work order.
   * @param {Object} workOrder.eta - The estimated time of arrival information for the work order.
   * @param {Object} workOrder.assignee - The assignee information for the work order.
   * @returns {Promise<void>} A promise that resolves when the work order has been processed.
   * @throws {Error} If there is an error during the processing of the work order.
   *
   * @example
   * const workOrderData = {
   *   id: 123,
   *   schedule: { /* schedule data *\/ },
   *   pay: { /* pay data *\/ },
   *   eta: { /* eta data *\/ },
   *   assignee: { /* assignee data *\/ }
   * };
   * await processAssignedWorkOrder(userId, workOrderData);
   */
  async processAssignedWorkOrder(userId, workOrder) {
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


  /**
   * Deletes outdated work orders that are not present in the current API response.
   *
   * @async
   * @function deleteOutdatedWorkOrders
   * @param {number} userId - The ID of the user associated with the work orders.
   * @param {Array<number>} currentlyAssignedWorkOrderIds - An array of work order IDs currently assigned to the user.
   * @returns {Promise<void>} A promise that resolves when the outdated work orders have been deleted.
   * @throws {Error} If there is an error during the deletion process.
   *
   * @example
   * const currentlyAssignedIds = [123, 456, 789];
   * await deleteOutdatedWorkOrders(userId, currentlyAssignedIds);
   */
  async deleteOutdatedWorkOrders(userId, currentlyAssignedWorkOrderIds) {
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

}

export default AssignedWorkOrder