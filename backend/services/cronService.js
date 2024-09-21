import Cron from '../models/cronModel.js';
import moment from 'moment-timezone';

class CronService {
  constructor(userId) {
    this.userId = userId;
  }

  async fetchAllCrons() {
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

  async deleteCron(cronId) {
    try {
      const cron = await Cron.findOne({cronId});
      if (!cron) {
        return { success: false, message: "Cron not found." };
      }
      cron.deleted = true;
      await cron.save();
      return { success: true, message: "Cron deleted successfully." };
    } catch (error) {
      console.error("Error deleting cron", error);
  
      throw error;
    }
  };

  localToUtc(localTime, timeZone) {
    const localDate = moment.tz(localTime, timeZone);
    return localDate.utc().format();
  }

  utcToLocal(utcTime, timeZone) {
    const utcDate = moment.utc(utcTime);
    return utcDate.tz(timeZone).format();
  }

  localTimeToUtcTime(localTime, timeZone) {
    const [hours, minutes] = localTime.split(':');
    const localDateTime = moment.tz({ hour: hours, minute: minutes }, timeZone);
    return localDateTime.utc().format('HH:mm');
  }

  utcTimeToLocalTime(utcTime, timeZone) {
    const [hours, minutes] = utcTime.split(':');
    const utcDateTime = moment.utc({ hour: hours, minute: minutes });
    return utcDateTime.tz(timeZone).format('HH:mm');
  }

}

export default CronService