const { Resend } = require('resend');
const { logger } = require('../config/logger');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send password reset email via Resend (HTTP API — works on Render free tier)
 */
exports.sendPasswordResetEmail = async (to, resetToken) => {
    const resetUrl = `${(process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '')}/reset-password/${resetToken}`;

    const siteUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');

    try {
        const { data, error } = await resend.emails.send({
            from: 'ServerChat <onboarding@resend.dev>',
            to: [to],
            subject: '🔑 Reset Your ServerChat Password',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#111118;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(180deg,rgba(255,255,255,0.03) 0%,transparent 100%);">
                        <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(180deg,rgba(255,255,255,0.03) 0%,transparent 100%);">
                            <div style="display:inline-block;width:48px;height:48px;background-color:#040407;border-radius:12px;position:relative;border:1px solid rgba(255,255,255,0.1);">
                                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);width:24px;height:24px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" style="width:100%;height:100%;">
                                        <path d="M12 2C6.48 2 2 6.03 2 11C2 13.08 2.84 14.99 4.25 16.51L3.25 21L7.56 19.53C8.93 20.19 10.43 20.6 12 20.6C17.52 20.6 22 16.57 22 11C22 6.03 17.52 2 12 2Z" />
                                        <circle cx="8" cy="11" r="1.5" fill="#040407"/>
                                        <circle cx="12" cy="11" r="1.5" fill="#040407"/>
                                        <circle cx="16" cy="11" r="1.5" fill="#040407"/>
                                    </svg>
                                </div>
                            </div>
                            <h1 style="color:#ffffff;font-size:22px;margin:16px 0 0;font-weight:700;">ServerChat</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:0 32px 32px;">
                            <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px;font-weight:600;">Password Reset Request</h2>
                            <p style="color:#8b8b9e;font-size:14px;line-height:1.6;margin:0 0 24px;">
                                We received a request to reset the password for your account. Click the button below to choose a new password.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="${resetUrl}" style="display:inline-block;background:#ffffff;color:#0a0a0f;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color:#5a5a6e;font-size:12px;line-height:1.5;margin:24px 0 0;">
                                This link expires in <strong style="color:#8b8b9e;">30 minutes</strong>. If you didn't request this, you can safely ignore this email.
                            </p>
                            <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.05);">
                                <p style="color:#3a3a4e;font-size:11px;margin:0;word-break:break-all;">
                                    If the button doesn't work, copy this link:<br>
                                    <a href="${resetUrl}" style="color:#6366f1;">${resetUrl}</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:16px 32px;background:rgba(255,255,255,0.02);text-align:center;">
                            <p style="color:#3a3a4e;font-size:11px;margin:0;">&copy; 2026 ServerChat &mdash; Secure &middot; Fast &middot; Global</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        });

        if (error) {
            logger.error(`Resend email error: ${JSON.stringify(error)}`);
            return false;
        }

        logger.info(`Password reset email sent to ${to} (ID: ${data?.id})`);
        return true;
    } catch (error) {
        logger.error(`Failed to send password reset email to ${to}: ${error.message}`);
        return false;
    }
};
