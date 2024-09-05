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
}

export default CronService