//? ===================================================== Admin Controller =====================================================

// ===================== Importing necessary modules/files =====================
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import { BadRequestError, NotAuthorizedError, NotFoundError } from "base-error-handler";
import generateAuthToken from "../utils/jwtHelpers/generateAuthToken.js";
import destroyAuthToken from "../utils/jwtHelpers/destroyAuthToken.js";
import winston, { Logger, format } from "winston";
import CronService from '../services/cronService.js';
import {
  fetchAllUsers,
  updateUser,
  blockUserHelper,
  unBlockUserHelper,
  activateUserHelper,
  deleteUserHelper,
  fetchAllActiveProviders,
} from "../utils/adminHelpers.js";

/*
   # Desc: Auth user/set token
   # Route: POST /api/v1/admin/auth
   # Access: PUBLIC
  */
const authAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    // If email or password is empty, return error
    throw new BadRequestError("Email and password must be provided.");
  }
  // Find the user in Db with the email and password
  const admin = await User.findOne({ email: email });
  let passwordValid = false;
  if (admin) {
    passwordValid = await admin.matchPassword(password);
  }
  if (passwordValid) {
    // If user is created, send response back with jwt token
    generateAuthToken(res, admin._id, admin.email); // Middleware to Generate token and send it back in response object
    const verifiedAdminData = {
      name: admin.name,
      email: admin.email,
      isAdmin: admin.isAdmin,
      isActive: admin.isActive,
    };
    res.status(200).json(verifiedAdminData);
  }
  if (!admin || !passwordValid) {
    // If user or user password is not valid, send error back
    throw new BadRequestError("Invalid Email or Password - Admin authentication failed.");
  }
});

  /*
     # Desc: Register new user
     # Route: POST /api/v1/admin/auth
     # Access: PUBLIC
    */
const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, adminRegistrationKey } = req.body;
  if (!email || !password) {
    // If email or password is empty, return error
    throw new BadRequestError("Email or Password is missing in the request - Admin registration failed.");
  }
  if (!adminRegistrationKey) {
    // If adminRegistrationKey is empty, return error
    throw new BadRequestError("No Admin Registration Access Code - Admin registration aborted.");
  } else {
    // Check if Admin registration key is valid
    if (process.env.ADMIN_REGISTRATION_KEY !== adminRegistrationKey) {
      throw new NotAuthorizedError();
    }
  }
  // Check if user already exist
  const userExists = await User.findOne({ email });
  // If the user already exists, throw an error
  if (userExists) {
    throw new BadRequestError("Admin already exists.");
  }
  // Store the user data to DB if the user dosen't exist already.
  const user = await User.create({
    name: name,
    email: email,
    password: password,
    isAdmin: true,
  });
  if (user) {
    // If user is created, send response back with jwt token
    generateAuthToken(res, user._id, user.email); // Middleware to Generate token and send it back in response object
    const registeredUserData = {
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    };
    res.status(201).json(registeredUserData);
  } else {
    // If user was NOT Created, send error back
    throw new BadRequestError("Invalid data - Admin registration failed.");
  }
});

  /*
     # Desc: Logout user / clear cookie
     # Route: POST /api/v1/admin/logout
     # Access: PUBLIC
    */
const logoutAdmin = asyncHandler(async (req, res) => {
  destroyAuthToken(res);
  res.status(200).json({ message: "Admin Logged Out" });
});

  /*
     # Desc: Get user profile
     # Route: GET /api/v1/admin/profile
     # Access: PRIVATE
    */
const getAdminProfile = asyncHandler(async (req, res) => {
  const user = {
    name: req.user.name,
    email: req.user.email,
  };
  res.status(200).json({ user });
});

  /*
     # Desc: Update Admin profile
     # Route: PUT /api/v1/admin/profile
     # Access: PRIVATE
    */
const updateAdminProfile = asyncHandler(async (req, res) => {
  // Find the user data with user id in the request object
  const admin = await User.findById(req.user._id);
  if (admin) {
    // Update the admin-user with new data if found or keep the old data itself.
    admin.name = req.body.name || admin.name;
    admin.email = req.body.email || admin.email;
    // If request has new password, update the user with the new password
    if (req.body.password) {
      admin.password = req.body.password;
    }
    if (req.file) {
      admin.profileImageName = req.file.filename || admin.profileImageName;
    }
    const updatedAdminData = await admin.save();
    // Send the response with updated user data
    res.status(200).json({
      name: updatedAdminData.name,
      email: updatedAdminData.email,
      profileImageName: updatedAdminData.profileImageName,
      isActive: updatedAdminData.isActive,
      isAdmin: updatedAdminData.isAdmin,
    });
  } else {
    // If requested admin was not found in db, return error
    throw new NotFoundError();
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { page } = req.params;

  // Define the query options
  const limit = 10;
  const start = page > 1 ? (page - 1) * limit : 0;
  const sort = { timestamp: -1 };

  const totalUsers = await User.countDocuments({
    $or: [
      { deleted: { $exists: false } },
      { deleted: false }
    ]});

  const usersData = await fetchAllUsers(start, limit, sort);
  if (usersData) {
    res.status(200).json({ usersData, totalUsers });
  } else {
    throw new NotFoundError();
  }
});

const getAllActiveProviders = asyncHandler(async (req, res) => {
  const providers = await fetchAllActiveProviders();
  if (providers) {
    res.status(200).json({ providers });
  } else {
    throw new NotFoundError();
  }
});

const activateUser = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  if (!userId) {
    throw new BadRequestError("UserId not received in request - User activation failed.");
  }
  const userActivationProcess = await activateUserHelper(userId);
  const responseMessage = userActivationProcess.message;
  if (userActivationProcess.success) {
    res.status(201).json({ message: responseMessage });
  } else {
    throw new BadRequestError(responseMessage);
  }
});

const blockUser = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  if (!userId) {
    throw new BadRequestError("UserId not received in request - User blocking failed.");
  }
  const userBlockingProcess = await blockUserHelper(userId);
  const responseMessage = userBlockingProcess.message;
  if (userBlockingProcess.success) {
    res.status(201).json({ message: responseMessage });
  } else {
    throw new BadRequestError(responseMessage);
  }
});

const unBlockUser = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  if (!userId) {
    throw new BadRequestError("UserId not received in request - User Un-blocking failed.");
  }
  const userUnblockingProcess = await unBlockUserHelper(userId);
  const responseMessage = userUnblockingProcess.message;
  if (userUnblockingProcess.success) {
    res.status(201).json({ message: responseMessage });
  } else {
    throw new BadRequestError(responseMessage);
  }
});

const updateUserData = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  const name = req.body.name;
  const email = req.body.email;
  if (!userId || !name || !email) {
    throw new BadRequestError("User data not received in request - User update failed.");
  }
  const userData = { userId: userId, name: name, email: email };
  const usersUpdateStatus = await updateUser(userData);
  if (usersUpdateStatus.success) {
    const response = usersUpdateStatus.message;
    res.status(200).json({ message: response });
  } else {
    throw new BadRequestError("User update failed.");
  }
});

// PUT endpoint to update isFnServiceCompanyAdmin for a specific userId
const updateFnServiceCompanyAdmin =  asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Step 1: Set isFnServiceCompanyAdmin = false for all existing admins
  await User.updateMany({ isFnServiceCompanyAdmin: true }, { $set: { isFnServiceCompanyAdmin: false } });

  // Step 2: Find and update the specific user by userId to set isFnServiceCompanyAdmin = true
  const user = await User.findOneAndUpdate(
    { userId: userId }, // Find the user by userId
    { $set: { isFnServiceCompanyAdmin: true } }, // Update isFnServiceCompanyAdmin to true
    { new: true } // Return the updated user
  );

  // Step 3: Check if the user exists
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    message: `User: ${user.name} is now the service company admin`,
    user,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    throw new BadRequestError("UserId not received in request");
  }

  const user = await User.findById(userId);

  // If cron exist for the user, delete tem as well
  const cronService = new CronService(user.userId);
  const crons = await cronService.fetchAllCrons();
  if (crons && crons.length) {
    crons.map(async (cron) => {
      await cronService.deleteCron(cron.cronId);
    });
  }

  // delete the user
  const userDeletingProcess = await deleteUserHelper(user._id);
  const responseMessage = userDeletingProcess.message;
  if (userDeletingProcess.success) {
    res.status(204).json({ message: responseMessage });
  } else {
    throw new BadRequestError(responseMessage);
  }
});

export {
  authAdmin,
  registerAdmin,
  logoutAdmin,
  getAdminProfile,
  updateAdminProfile,
  getAllUsers,
  blockUser,
  unBlockUser,
  updateUserData,
  activateUser,
  updateFnServiceCompanyAdmin,
  deleteUser,
  getAllActiveProviders,
};
