//? ===================================================== Admin Authentication Middleware =====================================================
import { BadRequestError } from "base-error-handler";
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

const verifyAdmin = asyncHandler(async (req, res, next) => {
  const decodedJwtPayload = req.currentUser;
  // Search the Db with the userId obtained after decoding jwt payload to Verify the userId claimed by JWT Payload is valid.
  const requestUser = await User.findOne({
    _id: decodedJwtPayload.id,
    isAdmin: true
  }).select('-password');
  if (requestUser) {
    req.user = requestUser; // Set the request user with the user data fetched from the Db
    next(); // Proceed to next function as the user is authenticated as Admin
  } else {
    throw new BadRequestError("Invalid User - Admin Authentication Failed.");
  }
});

export default verifyAdmin;

