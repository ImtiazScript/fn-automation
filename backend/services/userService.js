import User from '../models/userModel.js';
import IntegrationService from './integrationService.js';

class UserService {


  /**
   * Fetches all users from the database, excluding the password field.
   *
   * @async
   * @function fetchAllUsers
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of user objects without the password field.
   * @throws {Error} If there is an error while fetching users.
   *
   * @example
   * const users = await fetchAllUsers();
   * console.log(users); // Array of users without passwords
   */
  async fetchAllUsers() {
    try {
      const users = await User.find({}).select('-password'); // Exclude the password field
      return users;
    } catch (error) {
      throw new Error('Error fetching users');
    }
  }


  /**
   * Fetches all admin users from the database, excluding the password field.
   *
   * @async
   * @function fetchAllAdminUsers
   * @returns {Promise<Boolean>} A promise that resolves to an array of admin user objects without the password field.
   * @throws {Error} If there is an error while fetching admin users.
   *
   * @example
   * const adminUsers = await fetchAllAdminUsers();
   * console.log(adminUsers); // Array of admin users without passwords
   */
  async fetchAllAdminUsers() {
    try {
      const admins = await User.find({ isAdmin: true }).select('-password'); // Exclude the password field
      return admins;
    } catch (error) {
      throw new Error('Error fetching users');
    }
  }

    /**
   * Checking whether if an active admin is already available in the database.
   *
   * @async
   * @function isActiveAdminExist
   * @returns {Promise<Array<Object>>} A promise
   * @throws {Error} If there is an error while checking active admin users.
   */
  async isActiveAdminExist() {
    try {
      const admins = await User.find({ isAdmin: true, isActive: true });
      return admins.length > 0;
    } catch (error) {
      throw new Error('Error checking active admin user');
    }
  }

  
  /**
   * Fetches the access token for the Field Nation service company admin user.
   *
   * @async
   * @function getServiceCompanyAdminAccessToken
   * @returns {Promise<string>} A promise that resolves to the admin access token, or an empty string if the token cannot be retrieved.
   * @throws {Error} If there is an error while fetching the admin access token.
   *
   * @example
   * const accessToken = await getServiceCompanyAdminAccessToken();
   * console.log(accessToken); // Access token or an empty string
   */
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
