import logger from "../config/logger/winston-logger/loggerConfig.js";
import AssignedWorkOrders from '../models/assignedWorkOrdersModel.js';
import moment from 'moment-timezone';

class AssignedWorkOrder {
  async fetchAllAssignedWorkOrders() {
    try {
      const assignedWorkOrdersList = await AssignedWorkOrders.find();
      return assignedWorkOrdersList;
    } catch (error) {
      throw new Error('Error fetching assignedWorkOrdersList');
    }
  };

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

  // Function to process work orders (insert or update)
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


  // Function to delete outdated work orders
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