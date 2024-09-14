import User from "../models/userModel.js";

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
    await user.save();

    // If the user was successfully blocked, return a status indicating success
    return { success: true, message: "User blocked successfully." };

  } catch (error) {
    console.error("Error blocking user:", error);

    throw error;
  }
};

const activateUserHelper = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found." };
    }
    user.isActive = true;
    await user.save();
    return { success: true, message: "User activated successfully." };
  } catch (error) {
    console.error("Error activating user:", error);
    throw error;
  }
};

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
    await user.save();

    // If the user was successfully unblocked, return a status indicating success
    return { success: true, message: "User Un-blocked successfully." };

  } catch (error) {
    console.error("Error Un-blocking user:", error);

    throw error;
  }
};

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

const deleteUserHelper = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found." };
    }

    user.deleted = true;
    await user.save();
    return { success: true, message: "User deleted successfully." };
  } catch (error) {
    return { success: false, message: "Failed to delete user." };
  }
};

export { fetchAllUsers, blockUserHelper, unBlockUserHelper, updateUser, activateUserHelper, deleteUserHelper, fetchAllActiveProviders };
