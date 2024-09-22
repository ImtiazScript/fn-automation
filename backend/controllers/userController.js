//? ===================================================== User Controller =====================================================

// ===================== Importing necessary modules/files =====================
import asyncHandler from "express-async-handler";

import User from "../models/userModel.js";
import generateAuthToken from "../utils/jwtHelpers/generateAuthToken.js";
import destroyAuthToken from "../utils/jwtHelpers/destroyAuthToken.js";
import generatePasswordResetToken from '../utils/jwtHelpers/generatePasswordResetToken.js';
import { sendResetPasswordEmail, sendUserSignedUpEmail, sendAdminNewUserNotificationEmail } from '../utils/emailHelpers/SendMail.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '@emtiaj/custom-errors';

/*
   # Desc: Auth user/set token
   # Route: POST /api/v1/user/auth
   # Access: PUBLIC
  */
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    // If email or password is empty, return error
    throw new BadRequestError("Email or Password is missing in the request - User authentication failed.");
  }
  // Find the user in Db with the email and password
  const user = await User.findOne({ email: email });
  let passwordValid = false;
  if (user) {
    passwordValid = await user.matchPassword(password);
  }
  if (passwordValid) {
    // If password verified, check user-blocked status. send response back with jwt token
    const blockedUser = user.isBlocked();
    if (blockedUser) {
      throw new UnauthorizedError("Access Blocked - Contact Server Admin.");
    }
    // If password verified and user is not-blocked, send response back with jwt token
    generateAuthToken(res, user._id, user.email); // Middleware to Generate token and send it back in response object
    let registeredUserData = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    };
    if (user.profileImageName) {
      registeredUserData.profileImageName = user.profileImageName;
    }
    res.status(201).json(registeredUserData);
  }
  if (!user || !passwordValid) {
    // If user or user password is not valid, send error back
    throw new UnauthorizedError("Invalid Email or Password - User authentication failed.");
  }
});


/*
   # Desc: Register new user
   # Route: POST /api/v1/user/auth
   # Access: PUBLIC
  */
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  // Check if user already exist
  const userExists = await User.findOne({ email });
  // If the user already exists, throw an error
  if (userExists) {
    throw new BadRequestError("User already registered - Sign-Up Failed.");
  }
  // Store the user data to DB if the user dosen't exist already.
  const user = await User.create({
    name: name,
    email: email,
    password: password,
    isAdmin: false,
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

    // Send mail to admin
    await sendAdminNewUserNotificationEmail(user.userId, user.name, user.email, user.isAdmin);
    // Send mail to sign-up user
    await sendUserSignedUpEmail(user.userId, user.name, user.email, user.isAdmin);

    res.status(201).json(registeredUserData);
  } else {
    // If user was NOT Created, send error back
    throw new BadRequestError("Invalid User data - User registration failed.");
  }
});


/*
   # Desc: Logout user / clear cookie
   # Route: POST /api/v1/user/logout
   # Access: PUBLIC
  */
const logoutUser = asyncHandler(async (req, res) => {
  destroyAuthToken(res);
  res.status(200).json({ message: "User Logged Out" });
});


/*
   # Desc: Get user profile
   # Route: GET /api/v1/user/profile
   # Access: PRIVATE
  */
const getUserProfile = asyncHandler(async (req, res) => {
  const user = {
    name: req.user.name,
    email: req.user.email,
    profileImageName: req.user.profileImageName,
  };
  res.status(200).json({ user });
});


/*
   # Desc: Update user profile
   # Route: PUT /api/v1/user/profile
   # Access: PRIVATE
  */
const updateUserProfile = asyncHandler(async (req, res) => {
  // Find the user data with user id in the request object
  const user = await User.findById(req.user._id);
  if (user) {
    // Update the user with new data if found or keep the old data itself.
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    // If request has new password, update the user with the new password
    if (req.body.password) {
      user.password = req.body.password;
    }
    if (req.file) {
      user.profileImageName = req.file.filename || user.profileImageName;
    }
    const updatedUserData = await user.save();
    // Send the response with updated user data
    res.status(200).json({
      name: updatedUserData.name,
      email: updatedUserData.email,
      profileImageName: updatedUserData.profileImageName,
      isActive: updatedUserData.isActive,
    });
  } else {
    throw new NotFoundError("User not found.");
  }
});

/*
  # Desc: Forgot password
  # Route: POST /api/v1/user/forgot-password
  # Access: PUBLIC
*/
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw new NotFoundError('No user found with that email.');
  }

  // Generate reset token and set expiration
  const resetToken = generatePasswordResetToken(user._id);
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  // Send email with reset link
  // TODO: replace localhost:3000 with ${req.get('host')} when go live
  const resetUrl = `${req.protocol}://localhost:3000/reset-password?reset_token=${resetToken}`;
  await sendResetPasswordEmail(user.email, resetUrl);

  res.status(200).json({ message: 'Reset link sent to email' });
});


/*
  # Desc: Reset password
  # Route: POST /api/v1/user/reset-password
  # Access: PUBLIC
*/
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, password } = req.body;
  const user = await User.findOne({
    resetPasswordToken: resetToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new BadRequestError('Reset token is invalid or has expired.');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.status(200).json({ message: 'Password updated successfully' });
});



export {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
};
