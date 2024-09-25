//? ===================================================== Admin Authentication Middleware =====================================================
import { BadRequestError } from '@emtiaj/custom-errors';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

/**
 * Middleware to verify if the current user is an admin.
 *
 * This function checks the JWT payload to find the user ID and
 * verifies that the user exists in the database and has admin rights.
 *
 * @async
 * @function verifyAdmin
 * @param {Object} req - The request object, containing the current user information.
 * @param {Object} res - The response object, used to send responses.
 * @param {function} next - The next middleware function to call.
 * @throws {BadRequestError} If the user is not found or is not an admin.
 */
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

