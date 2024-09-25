import Cron from '../models/cronModel.js';

class CronService {
  constructor(userId) {
    this.userId = userId;
  }


  /**
   * Fetches all cron jobs associated with the user.
   *
   * @async
   * @function fetchAllCrons
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of cron job objects for the user.
   * @throws {Error} If there is an error during the fetching process.
   *
   * @example
   * const crons = await fetchAllCrons();
   * console.log(crons);
   */
  async fetchAllCrons() {
    try {
      const crons = await Cron.find({ userId: this.userId });
      return crons;
    } catch (error) {
      throw new Error('Error fetching crons');
    }
  };


  /**
   * Updates the total requested work orders and adds a new work order ID to the existing array.
   *
   * @async
   * @function updateRequestedWorkOrders
   * @param {string} cronId - The ID of the cron job to update.
   * @param {string} workOrderId - The ID of the work order to be added.
   * @returns {Promise<Object>} A promise that resolves to the updated cron job object.
   * @throws {Error} If the cron job is not found or there is an error during the update process.
   *
   * @example
   * const updatedCron = await updateRequestedWorkOrders('cronId123', 'workOrderId456');
   * console.log(updatedCron);
   */
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

  
  /**
   * Marks a cron job as deleted by setting its `deleted` flag to true.
   *
   * @async
   * @function deleteCron
   * @param {string} cronId - The ID of the cron job to delete.
   * @returns {Promise<Object>} A promise that resolves to an object indicating the success status and message.
   * @throws {Error} If there is an error during the deletion process.
   *
   * @example
   * const result = await deleteCron('cronId123');
   * console.log(result); // { success: true, message: "Cron deleted successfully." }
   */
  async deleteCron(cronId) {
    try {
      const cron = await Cron.findOne({ cronId });
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

}

export default CronService