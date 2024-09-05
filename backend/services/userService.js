import User from '../models/userModel.js';

class UserService {
  // Fetch all users and exclude the password field
  async fetchAllUsers() {
    try {
      const users = await User.find({}).select('-password'); // Exclude the password field
      return users;
    } catch (error) {
      throw new Error('Error fetching users');
    }
  }
}

export default UserService;
