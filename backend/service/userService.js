import User from '../models/userModel.js';

export const fetchAllUsers = async () => {
  try {
    const users = await User.find({}).select('-password'); // Exclude the password field for security reasons
    return users;
  } catch (error) {
    throw new Error('Error fetching users');
  }
};