import nodemailer from 'nodemailer';

const sendEmail = async (email, subject, htmlBody) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail', // or another email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const message = {
        to: email,
        from: process.env.EMAIL_USER,
        subject: subject,
        html: htmlBody,
    };

    await transporter.sendMail(message);
};


// Functions to send specific types of emails
export const sendResetPasswordEmail = async (email, resetUrl) => {
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. If you did not make this request, you can ignore this email.</p>
        <p>If you'd like to reset your password, click the link below:</p>
        <a href="${resetUrl}" 
        style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center;
                text-decoration: none; border-radius: 5px; font-size: 16px;">
        Reset Password
        </a>
        <p style="margin-top: 20px;">This link will expire in 1 hour for your security.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p>If you're having trouble with the button above, copy and paste the following link into your browser:</p>
        <p><a href="${resetUrl}" style="color: #4CAF50;">${resetUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 14px; color: #555;">
        If you have any questions, please contact us at <a href="mailto:${process.env.SUPPORT_MAIL}" style="color: #4CAF50;">${process.env.SUPPORT_MAIL}</a>.
        </p>
        <p style="margin-top: 20px;">Regards,<br/>The ${process.env.COMPANY_NAME} Team</p>
    </div>`;

    await sendEmail(email, `${process.env.COMPANY_NAME} - Password Reset Request`, htmlBody);
};

export const sendAdminNewUserNotificationEmail = async (userId, name, email, isAdmin) => {
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>New User Signed Up on ${process.env.COMPANY_NAME}</h2>
        <p>Hello Admin,</p>
        <p>A new user has just signed up on ${process.env.COMPANY_NAME} and is awaiting account activation.</p>
        <p><strong>User Details:</strong></p>
        <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>User ID:</strong> ${userId}</li>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Role:</strong> ${isAdmin ? 'Admin' : 'Provider'}</li>
        </ul>
        <p>Please review this user’s account and activate it if everything is in order.</p>
        <p style="margin-top: 20px;">You can activate the account by logging into the admin panel and navigating to the user management section.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="margin-top: 20px;">Regards,<br/>The ${process.env.COMPANY_NAME} Team</p>
    </div>`;

    await sendEmail(process.env.ADMIN_EMAIL, `${process.env.COMPANY_NAME} - New User Sign-Up Notification: ${name}`, htmlBody);
};


export const sendUserSignedUpEmail = async (userId, name, email, isAdmin) => {
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Welcome to ${process.env.COMPANY_NAME}!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for signing up for an account with ${process.env.COMPANY_NAME}. We are excited to have you on board!</p>
        <p>Your account details are as follows:</p>
        <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>User ID:</strong> ${userId}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Role:</strong> ${isAdmin ? 'Admin' : 'Provider'}</li>
        </ul>
        <p>Please wait until an admin review and activate your account.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p>If you have any questions or need assistance, feel free to contact us at <a href="mailto:${process.env.SUPPORT_MAIL}" style="color: #4CAF50;">${process.env.SUPPORT_MAIL}</a>.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="margin-top: 20px;">Regards,<br/>The ${process.env.COMPANY_NAME} Team</p>
    </div>`;
    await sendEmail(email, `Welcome to ${process.env.COMPANY_NAME}`, htmlBody);
};

export const sendUserActivatedEmail = async (name, email) => {
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Your Account Has Been Activated</h2>
        <p>Hello ${name},</p>
        <p>We are pleased to inform you that your account on ${process.env.COMPANY_NAME} has been successfully activated.</p>
        <p>You can now log in and start using our services.</p>
        <p style="margin-top: 20px;">
            <a href="${process.env.LOGIN_URL}" 
               style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center;
                      text-decoration: none; border-radius: 5px; font-size: 16px;">
                Log In to Your Account
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p>If you have any questions or need support, feel free to contact us at <a href="mailto:${process.env.SUPPORT_MAIL}" style="color: #4CAF50;">${process.env.SUPPORT_MAIL}</a>.</p>
        <p style="margin-top: 20px;">Regards,<br/>The ${process.env.COMPANY_NAME} Team</p>
    </div>`;

    await sendEmail(email, `${process.env.COMPANY_NAME} - Your Account Has Been Activated`, htmlBody);
};

export const sendUserBlockedEmail = async (name, email) => {
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Account Blocked Notification</h2>
        <p>Hello ${name},</p>
        <p>We regret to inform you that your account on ${process.env.COMPANY_NAME} has been blocked.</p>
        <p>If you believe this is a mistake or would like further information, please contact us at:</p>
        <p style="margin-top: 20px;">
            <a href="mailto:${process.env.SUPPORT_MAIL}" style="color: #4CAF50;">${process.env.SUPPORT_MAIL}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="margin-top: 20px;">Regards,<br/>The ${process.env.COMPANY_NAME} Team</p>
    </div>`;

    await sendEmail(email, `${process.env.COMPANY_NAME} - Your Account Has Been Blocked`, htmlBody);
};


export const sendUserUnblockedEmail = async (name, email) => {
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Account Unblocked Notification</h2>
        <p>Hello ${name},</p>
        <p>We are pleased to inform you that your account on ${process.env.COMPANY_NAME} has been successfully unblocked.</p>
        <p>You can now log in and resume using our services.</p>
        <p style="margin-top: 20px;">
            <a href="${process.env.LOGIN_URL}" 
               style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center;
                      text-decoration: none; border-radius: 5px; font-size: 16px;">
                Log In to Your Account
            </a>
        </p>
        <p>If you experience any issues accessing your account, feel free to reach out to our support team for assistance:</p>
        <p style="margin-top: 20px;">
            <a href="mailto:${process.env.SUPPORT_MAIL}" style="color: #4CAF50;">${process.env.SUPPORT_MAIL}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="margin-top: 20px;">Regards,<br/>The ${process.env.COMPANY_NAME} Team</p>
    </div>`;

    await sendEmail(email, `${process.env.COMPANY_NAME} - Your Account Has Been Unblocked`, htmlBody);
};
