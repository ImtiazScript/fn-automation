import AssignedWorkOrders from '../models/assignedWorkOrdersModel.js';

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
            }
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
        }
      };

      return assignedWorkOrderSchedule;
    } catch (error) {
      console.log(error);
      throw new Error('Error fetching assignedWorkOrderSchedule');
    }
  };

}

export default AssignedWorkOrder