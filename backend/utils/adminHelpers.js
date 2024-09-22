import User from "../models/userModel.js";


/**
 * Fetches all users from the database with pagination, sorting, and filtering for deleted users.
 *
 * @async
 * @function fetchAllUsers
 * @param {number} start - The index to start fetching users from (for pagination).
 * @param {number} limit - The maximum number of users to fetch.
 * @param {object} sort - The sorting criteria (e.g., { name: 1 } for ascending or { name: -1 } for descending).
 * @returns {Promise<Array>} A promise that resolves to an array of user objects.
 * @throws {Error} Throws an error if there is an issue fetching users from the database.
 *
 * @example
 * const users = await fetchAllUsers(0, 10, { name: 1 });
 * console.log(users); // Outputs an array of users
 */
const fetchAllUsers = async (start, limit, sort) => {
  try {
    const users = await User.find(
      {
        $or: [
          { deleted: { $exists: false } },  // Documents where 'deleted' field doesn't exist
          { deleted: false }                // Documents where 'deleted' is explicitly set to false
        ]
      },
      { name: 1, email: 1, blocked: 1, isActive: 1, isAdmin: 1, profileImageName: 1, userId: 1 })
      .skip(start)
      .limit(limit)
      .sort(sort)
      .lean();

    // const users = await User.find(
    //   { deleted: false },  // Condition to filter users where deleted is false
    //   { password: 0, deleted: 0 }  // Exclude the 'password' and 'deleted' fields
    // );

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);

    throw error;
  }
};


/**
 * Fetches all active providers from the database who are not blocked and are not admins.
 *
 * @async
 * @function fetchAllActiveProviders
 * @returns {Promise<Array>} A promise that resolves to an array of active provider user objects.
 * @throws {Error} Throws an error if there is an issue fetching users from the database.
 *
 * @example
 * const activeProviders = await fetchAllActiveProviders();
 * console.log(activeProviders); // Outputs an array of active providers
 */
const fetchAllActiveProviders = async () => {
  try {
    const users = await User.find(
      {
        isActive: true,
        blocked: false,
        isAdmin: false,
        $or: [
          { deleted: { $exists: false } },  // Documents where 'deleted' field doesn't exist
          { deleted: false }                // Documents where 'deleted' is explicitly set to false
        ]
      },
      { password: 0, isFnServiceCompanyAdmin: 0, } // Exclude fields
    )
      .lean();

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};


/**
 * Blocks a user by setting the `blocked` property to true.
 *
 * @async
 * @function blockUserHelper
 * @param {string} userId - The ID of the user to be blocked.
 * @returns {Promise<Object>} A promise that resolves to an object indicating the result of the operation.
 * @throws {Error} Throws an error if there is an issue blocking the user.
 *
 * @example
 * const result = await blockUserHelper('user_id_here');
 * if (result.success) {
 *   console.log('User successfully blocked.');
 * } else {
 *   console.log(result.message); // Outputs error message if user not found
 * }
 */
const blockUserHelper = async (userId) => {
  try {
    // Attempt to find the user by their _id
    const user = await User.findById(userId);

    if (!user) {
      // If the user wasn't found (already deleted or never existed), return a status indicating failure
      return { success: false, message: "User not found." };
    }

    user.blocked = true;
    // Save the updated user data
    return await user.save();
  } catch (error) {
    console.error("Error blocking user:", error);

    throw error;
  }
};


/**
 * Activates a user by setting the `isActive` property to true.
 *
 * @async
 * @function activateUserHelper
 * @param {string} userId - The ID of the user to be activated.
 * @returns {Promise<Object>} A promise that resolves to an object indicating the result of the operation.
 * @throws {Error} Throws an error if there is an issue activating the user.
 *
 * @example
 * const result = await activateUserHelper('user_id_here');
 * if (result.success) {
 *   console.log('User successfully activated.');
 * } else {
 *   console.log(result.message); // Outputs error message if user not found
 * }
 */
const activateUserHelper = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found." };
    }
    user.isActive = true;
    return await user.save();
  } catch (error) {
    console.error("Error activating user:", error);
    throw error;
  }
};


/**
 * Unblocks a user by setting the `blocked` property to false.
 *
 * @async
 * @function unBlockUserHelper
 * @param {string} userId - The ID of the user to be unblocked.
 * @returns {Promise<Object>} A promise that resolves to an object indicating the result of the operation.
 * @throws {Error} Throws an error if there is an issue unblocking the user.
 *
 * @example
 * const result = await unBlockUserHelper('user_id_here');
 * if (result.success) {
 *   console.log('User successfully unblocked.');
 * } else {
 *   console.log(result.message); // Outputs error message if user not found
 * }
 */
const unBlockUserHelper = async (userId) => {
  try {
    // Attempt to find the user by their _id
    const user = await User.findById(userId);

    if (!user) {
      // If the user wasn't found (already deleted or never existed), return a status indicating failure
      return { success: false, message: "User not found." };
    }

    user.blocked = false;
    // Save the updated user data
    return await user.save();
  } catch (error) {
    console.error("Error Un-blocking user:", error);

    throw error;
  }
};


/**
 * Updates the user's name and email based on the provided user data.
 *
 * @async
 * @function updateUser
 * @param {Object} userData - The data for the user to be updated.
 * @param {string} userData.userId - The ID of the user to update.
 * @param {string} userData.name - The new name for the user.
 * @param {string} userData.email - The new email for the user.
 * @returns {Promise<Object>} A promise that resolves to an object indicating the result of the operation.
 * @throws {Error} Throws an error if there is an issue updating the user.
 *
 * @example
 * const result = await updateUser({ userId: 'user_id_here', name: 'New Name', email: 'newemail@example.com' });
 * if (result.success) {
 *   console.log(result.message); // Outputs success message
 * } else {
 *   console.log(result.message); // Outputs error message if user not found
 * }
 */
const updateUser = async (userData) => {
  try {
    const user = await User.findById(userData.userId);

    if (!user) {
      // If the user wasn't found, return a status indicating failure
      return { success: false, message: "User not found." };
    }

    // Update user.name and user.email with the new values
    user.name = userData.name;
    user.email = userData.email;

    // Save the updated user data
    await user.save();

    return { success: true, message: "User updated successfully." };
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export { fetchAllUsers, blockUserHelper, unBlockUserHelper, updateUser, activateUserHelper, fetchAllActiveProviders };
