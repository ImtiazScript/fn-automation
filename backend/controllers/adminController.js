//? ===================================================== Admin Controller =====================================================

// ===================== Importing necessary modules/files =====================
import asyncHandler from "express-async-handler";
import AdminModel from "../models/adminModel.js";
import CronModel from "../models/cronModel.js";

import { BadRequestError, NotAuthorizedError, NotFoundError } from "base-error-handler";

import generateAuthToken from "../utils/jwtHelpers/generateAuthToken.js";
import destroyAuthToken from "../utils/jwtHelpers/destroyAuthToken.js";

import {
  fetchAllUsers,
  updateUser,
  blockUserHelper,
  unBlockUserHelper
} from "../utils/adminHelpers.js";

const authAdmin = asyncHandler(async (req, res) => {
  /*
     # Desc: Auth user/set token
     # Route: POST /api/v1/admin/auth
     # Access: PUBLIC
    */

  const { email, password } = req.body;

  if (!email || !password) {

    // If email or password is empty, return error
    throw new BadRequestError("Email and password must be provided.");

  }

  // Find the user in Db with the email and password
  const admin = await AdminModel.findOne({ email: email });

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
    };

    res.status(200).json(verifiedAdminData);
  }

  if (!admin || !passwordValid) {
    // If user or user password is not valid, send error back

    throw new BadRequestError("Invalid Email or Password - Admin authentication failed.");
  }
});

const registerAdmin = asyncHandler(async (req, res) => {
  /*
     # Desc: Register new user
     # Route: POST /api/v1/admin/auth
     # Access: PUBLIC
    */

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
  const userExists = await AdminModel.findOne({ email });

  // If the user already exists, throw an error
  if (userExists) {

    throw new BadRequestError("Admin already exists.");

  }

  // Store the user data to DB if the user dosen't exist already.
  const user = await AdminModel.create({
    name: name,
    email: email,
    password: password,
  });

  if (user) {
    // If user is created, send response back with jwt token

    generateAuthToken(res, user._id, user.email); // Middleware to Generate token and send it back in response object

    const registeredUserData = {
      name: user.name,
      email: user.email,
    };

    res.status(201).json(registeredUserData);
  } else {

    // If user was NOT Created, send error back
    throw new BadRequestError("Invalid data - Admin registration failed.");

  }
  
});

const logoutAdmin = asyncHandler(async (req, res) => {
  /*
     # Desc: Logout user / clear cookie
     # Route: POST /api/v1/admin/logout
     # Access: PUBLIC
    */

  destroyAuthToken(res);

  res.status(200).json({ message: "Admin Logged Out" });
});

const getAdminProfile = asyncHandler(async (req, res) => {
  /*
     # Desc: Get user profile
     # Route: GET /api/v1/admin/profile
     # Access: PRIVATE
    */

  const user = {
    name: req.user.name,
    email: req.user.email,
  };

  res.status(200).json({ user });
});

const updateAdminProfile = asyncHandler(async (req, res) => {
  /*
     # Desc: Update Admin profile
     # Route: PUT /api/v1/admin/profile
     # Access: PRIVATE
    */

  // Find the user data with user id in the request object
  const admin = await AdminModel.findById(req.user._id);

  if (admin) {
    // Update the admin-user with new data if found or keep the old data itself.
    admin.name = req.body.name || admin.name;
    admin.email = req.body.email || admin.email;

    // If request has new password, update the user with the new password
    if (req.body.password) {
      admin.password = req.body.password;
    }

    const updatedAdminData = await admin.save();

    // Send the response with updated user data
    res.status(200).json({
      name: updatedAdminData.name,
      email: updatedAdminData.email,
    });

  } else {

    // If requested admin was not found in db, return error
    throw new NotFoundError();
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  const usersData = await fetchAllUsers();

  if (usersData) {

    res.status(200).json({ usersData });

  } else {

    throw new NotFoundError();

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


/*
  # Desc: Add a new cron
  # Route: POST /api/v1/admin/add-cron
  # Access: PRIVATE
*/
const addCron = asyncHandler(async (req, res) => {
  try {
    const { userId, centerZip, cronStartAt, cronEndAt, workingWindowStartAt, workingWindowEndAt, drivingRadius, requestedWoIds, totalRequested, status, deleted } = req.body;

    const cron = await CronModel.create({
      userId: userId,
      centerZip: centerZip,
      cronStartAt: cronStartAt,
      cronEndAt: cronEndAt,
      workingWindowStartAt: workingWindowStartAt,
      workingWindowEndAt: workingWindowEndAt,
      drivingRadius: drivingRadius,
      requestedWoIds: requestedWoIds,
      totalRequested: totalRequested,
      status: status,
      deleted: deleted
    });
    if (cron) {
      res.status(201).json({ message: "Successfully added the cron", cron: cron });
    }
  } catch (error) {
    console.error("Error adding cron:", error.message); // Print the error message to the console
    res.status(500).json({ message: "Failed to add cron", error: error.message }); // Send a response with the error message
  }
});


/*
   # Desc: Update an existing cron
   # Route: PUT /api/v1/admin/update-cron
   # Access: PRIVATE
  */
const updateCron = asyncHandler(async (req, res) => {
  const { cronId, userId, centerZip, cronStartAt, cronEndAt, workingWindowStartAt, workingWindowEndAt, drivingRadius, requestedWoIds, totalRequested, status, deleted } = req.body;

  if (!cronId) {
    throw new BadRequestError("Cron id is missing in the request - cron updating failed.");
  }

  try {
    // Find the existing cron by Id
    const cronExist = await CronModel.findOne({ cronId });

    if (cronExist) {
      // Update only the fields that are provided in the request
      const updatedFields = {};
      if (userId !== undefined) updatedFields.userId = userId;
      if (centerZip !== undefined) updatedFields.centerZip = centerZip;
      if (cronStartAt !== undefined) updatedFields.cronStartAt = cronStartAt;
      if (cronEndAt !== undefined) updatedFields.cronEndAt = cronEndAt;
      if (workingWindowStartAt !== undefined) updatedFields.workingWindowStartAt = workingWindowStartAt;
      if (workingWindowEndAt !== undefined) updatedFields.workingWindowEndAt = workingWindowEndAt;
      if (drivingRadius !== undefined) updatedFields.drivingRadius = drivingRadius;
      if (requestedWoIds !== undefined) updatedFields.requestedWoIds = requestedWoIds;
      if (totalRequested !== undefined) updatedFields.totalRequested = totalRequested;
      if (status !== undefined) updatedFields.status = status;
      if (deleted !== undefined) updatedFields.deleted = deleted;

      // Perform the update
      const updatedCron = await CronModel.findByIdAndUpdate(cronExist._id, updatedFields, { new: true });

      res.status(200).json({ message: "Successfully updated the cron", cron: updatedCron });
    } else {
      throw new BadRequestError("Cron not found - updating failed.");
    }
  } catch (error) {
    console.error("Error updating cron:", error.message);
    res.status(500).json({ message: "Failed to update cron", error: error.message });
  }
});


/*
   # Desc: Get all crons
   # Route: PUT /api/v1/admin/get-crons
   # Access: PRIVATE
  */
const getAllCrons = asyncHandler(async (req, res) => {
  try {
    const cronsData = await CronModel.aggregate([
      {
        $lookup: {
          from: 'users', // The collection name in MongoDB
          localField: 'userId',
          foreignField: 'userId',
          as: 'userDetails'
        }
      },
      {
        $unwind: {
          path: '$userDetails',
          preserveNullAndEmptyArrays: true // This will keep crons even if there is no matching user
        }
      },
      {
        $project: {
          cronId: 1,
          userId: 1,
          centerZip: 1,
          cronStartAt: 1,
          cronEndAt: 1,
          workingWindowStartAt: 1,
          workingWindowEndAt: 1,
          drivingRadius: 1,
          requestedWoIds: 1,
          totalRequested: 1,
          status: 1,
          deleted: 1,
          createdAt: 1,
          updatedAt: 1,
          name: { $ifNull: ['$userDetails.name', 'Unknown'] } // Provide a default name if not found
        }
      }
    ]);
    res.status(200).json({ cronsData });
  } catch (error) {
    res.status(500).json({ message: "Failed to get crons", error: error.message });
  }
})

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
  addCron,
  updateCron,
  getAllCrons,
};
