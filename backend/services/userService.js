import User from '../models/userModel.js';
import IntegrationService from './integrationService.js';

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

  // Fetch all users and exclude the password field
  async fetchAllAdminUsers() {
    try {
      const admins = await User.find({ isAdmin: true }).select('-password'); // Exclude the password field
      return admins;
    } catch (error) {
      throw new Error('Error fetching users');
    }
  }

  // Fetch field nation servie company admin access token
  async getServiceCompanyAdminAccessToken() {
    const adminUser = await User.findOne({ isFnServiceCompanyAdmin: true }).select('-password');
    if (!adminUser || !adminUser.userId) {
      return '';
    }
    const integrationService = new IntegrationService(adminUser.userId);
    const adminIntegration = await integrationService.fetchIntegration();
    if (!adminIntegration || !adminIntegration.fnUserId || adminIntegration.integrationStatus == 'Not Connected' || adminIntegration.disabled) {
      return '';
    }
    return adminIntegration.fnAccessToken ? adminIntegration.fnAccessToken : '';
  }
}

export default UserService;
