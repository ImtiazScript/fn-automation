import nodemailer from 'nodemailer';

const sendResetPasswordEmail = async (email, resetUrl) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail', // or another email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailBody = `
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
            This email was sent by ${process.env.COMPANY_NAME}.
            <br />If you have any questions, please contact us at <a href="mailto:${process.env.SUPPORT_MAIL}" style="color: #4CAF50;">${process.env.SUPPORT_MAIL}</a>.
            </p>
            <p style="margin-top: 20px;">Regards,<br/>The ${process.env.COMPANY_NAME} Team</p>
        </div>`;

    const message = {
        to: `"${process.env.COMPANY_NAME}" ${email}`,
        from: process.env.EMAIL_USER,
        subject: `${process.env.COMPANY_NAME} - Password Reset Request`,
        html: mailBody,
    };

    await transporter.sendMail(message);
};

export default sendResetPasswordEmail;