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
            mode: assignedWorkOrder.schedule.service_window.mode,
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

}

export default AssignedWorkOrder