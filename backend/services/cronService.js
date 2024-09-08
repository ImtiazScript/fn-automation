import Cron from '../models/cronModel.js';

class CronService {
  constructor(userId) {
    this.userId = userId;
  }

  async fetchCrons() {
    try {
      const crons = await Cron.find({ userId: this.userId });
      return crons;
    } catch (error) {
      throw new Error('Error fetching crons');
    }
  };

  // Function to update the total requested work orders and push the new work order ID to existing array
  async updateRequestedWorkOrders(cronId, workOrderId) {
    try {
      const cron = await Cron.findOne({ cronId, userId: this.userId });
      if (cron) {
        cron.totalRequested = cron.totalRequested ? cron.totalRequested + 1 : 1;
        cron.requestedWoIds.push(workOrderId);
        await cron.save();
        return cron;
      } else {
        throw new Error(`Cron with ID ${cronId} not found for user ${this.userId}`);
      }
    } catch (error) {
      throw new Error(`Error updating requested work orders: ${error.message}`);
    }
  }
}

export default CronService