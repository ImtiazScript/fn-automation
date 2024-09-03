import Cron from '../models/cronModel.js';

export const fetchCronsByUserId = async (userId) => {
  try {
    const crons = await Cron.find({userId}); // Exclude the password field for security reasons
    return crons;
  } catch (error) {
    throw new Error('Error fetching crons');
  }
};