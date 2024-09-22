//? ===================================================== Password Reset token generator =====================================================
import jwt from 'jsonwebtoken';


/**
 * Generates a password reset token for the given user ID.
 *
 * @function generatePasswordResetToken
 * @param {string} userId - The ID of the user for whom the password reset token is generated.
 * @returns {string} The generated password reset token.
 *
 * @example
 * const token = generatePasswordResetToken(userId);
 * console.log(token); // Outputs the JWT for password reset
 */
const generatePasswordResetToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_KEY, {
        expiresIn: '1h',
    });
};

export default generatePasswordResetToken;