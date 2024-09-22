//? ===================================================== User Authentication Middleware =====================================================
import { BadRequestError, UnauthorizedError } from '@emtiaj/custom-errors';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

/**
 * Middleware to verify if the current user is valid and not blocked.
 *
 * This function checks the JWT payload for the user ID and verifies 
 * that the user exists in the database and is not blocked.
 *
 * @async
 * @function verifyUser
 * @param {Object} req - The request object, containing the current user information.
 * @param {Object} res - The response object, used to send responses.
 * @param {function} next - The next middleware function to call.
 * @throws {UnauthorizedError} If the user is blocked.
 * @throws {BadRequestError} If the user is not found.
 */
const verifyUser = asyncHandler(async (req, res, next) => {
    const decodedJwtPayload = req.currentUser;
    // Search the Db with the userId obtained after decoding jwt payload to Verify the userId claimed by JWT Payload is valid.
    const requestUser = await User.findById(decodedJwtPayload.id).select('-password');
    if (requestUser) {
        // If user is blocked - deny access.
        const blockedUser = requestUser.isBlocked();
        if (blockedUser) {
            throw new UnauthorizedError();
        }
        req.user = requestUser; // Set the request user with the user data fetched from the Db
        next(); // Proceed to next function as the user is authenticated as Admin
    } else {
        throw new BadRequestError("Invalid User - User Authentication Failed.");
    }
});

export default verifyUser;

