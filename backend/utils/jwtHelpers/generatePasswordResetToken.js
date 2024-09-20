//? ===================================================== Password Reset token generator =====================================================

import jwt from 'jsonwebtoken';

const generatePasswordResetToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_KEY, {
        expiresIn: '1h',
    });
};

export default generatePasswordResetToken;