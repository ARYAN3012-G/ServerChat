const { Resend } = require('resend');
const { logger } = require('../config/logger');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send password reset email via Resend (HTTP API — works on Render free tier)
 */
exports.sendPasswordResetEmail = async (to, resetToken) => {
    const resetUrl = `${(process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '')}/reset-password/${resetToken}`;

    if (!resend) {
        logger.warn('Mock password reset email sent. RESEND_API_KEY missing.');
        return true;
    }

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
<body style="margin:0;padding:0;background-color:#06060b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#06060b;padding:40px 20px;">
        <tr>
            <td align="center">
                <!-- Decorative top accent -->
                <div style="width:100%;max-width:480px;height:3px;background:linear-gradient(90deg,transparent,#6366f1,#8b5cf6,#a855f7,transparent);border-radius:4px;margin-bottom:24px;"></div>

                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:linear-gradient(180deg,#13131d 0%,#0e0e16 100%);border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                    <!-- Header with gradient background -->
                    <tr>
                        <td style="padding:40px 32px 28px;text-align:center;background:linear-gradient(135deg,rgba(99,102,241,0.08) 0%,rgba(139,92,246,0.05) 50%,transparent 100%);">
                            <!-- Logo Badge -->
                            <div style="display:inline-block;width:56px;height:56px;background:linear-gradient(135deg,#e0e0e0,#ffffff);border-radius:14px;line-height:56px;font-size:28px;text-align:center;box-shadow:0 8px 24px rgba(255,255,255,0.1);">💬</div>
                            <h1 style="color:#ffffff;font-size:24px;margin:16px 0 4px;font-weight:700;letter-spacing:-0.5px;">ServerChat</h1>
                            <p style="color:#4a4a6a;font-size:12px;margin:0;text-transform:uppercase;letter-spacing:2px;font-weight:500;">Password Reset</p>
                        </td>
                    </tr>
                    <!-- Divider line -->
                    <tr>
                        <td style="padding:0 32px;">
                            <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent);"></div>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:28px 32px 32px;">
                            <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px;font-weight:600;">Password Reset Request</h2>
                            <p style="color:#8b8b9e;font-size:14px;line-height:1.7;margin:0 0 28px;">
                                We received a request to reset the password for your account. Click the button below to choose a new password.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#ffffff,#e8e8e8);color:#0a0a0f;font-weight:700;font-size:15px;padding:14px 40px;border-radius:12px;text-decoration:none;box-shadow:0 4px 16px rgba(255,255,255,0.15);">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color:#5a5a6e;font-size:12px;line-height:1.5;margin:28px 0 0;">
                                This link expires in <strong style="color:#8b8b9e;">30 minutes</strong>. If you didn't request this, you can safely ignore this email.
                            </p>
                            <!-- Separator -->
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
                        <td style="padding:16px 32px;background:rgba(255,255,255,0.02);text-align:center;border-top:1px solid rgba(255,255,255,0.04);">
                            <p style="color:#3a3a4e;font-size:11px;margin:0;">&copy; 2026 ServerChat &mdash; Secure &middot; Fast &middot; Global</p>
                        </td>
                    </tr>
                </table>

                <!-- Decorative bottom accent -->
                <div style="width:100%;max-width:480px;height:2px;background:linear-gradient(90deg,transparent,#6366f1,#8b5cf6,#a855f7,transparent);border-radius:4px;margin-top:24px;opacity:0.5;"></div>
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

/**
 * Send contact form email to admin via Resend
 */
exports.sendContactEmail = async ({ name, email, subject, message }) => {
    const submittedAt = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    if (!resend) {
        logger.warn('Mock contact email sent. RESEND_API_KEY missing.');
        return true;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'ServerChat Contact <onboarding@resend.dev>',
            to: ['aryanrajeshgadam.3012@gmail.com'],
            replyTo: email,
            subject: `📬 [ServerChat Contact] ${subject || 'New message from ' + name}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#06060b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#06060b;padding:40px 20px;">
        <tr>
            <td align="center">
                <!-- Top accent bar -->
                <div style="width:100%;max-width:520px;height:3px;background:linear-gradient(90deg,transparent,#6366f1,#8b5cf6,#ec4899,transparent);border-radius:4px;margin-bottom:24px;"></div>

                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(180deg,#13131d 0%,#0e0e16 100%);border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
                    <!-- Header -->
                    <tr>
                        <td style="padding:36px 36px 24px;text-align:center;background:linear-gradient(135deg,rgba(99,102,241,0.1) 0%,rgba(236,72,153,0.05) 100%);">
                            <div style="display:inline-block;width:60px;height:60px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;line-height:60px;font-size:28px;text-align:center;box-shadow:0 8px 24px rgba(99,102,241,0.3);">💬</div>
                            <h1 style="color:#ffffff;font-size:22px;margin:14px 0 4px;font-weight:700;letter-spacing:-0.5px;">ServerChat</h1>
                            <p style="color:#6366f1;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:3px;font-weight:600;">New Contact Message</p>
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr><td style="padding:0 36px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent);"></div></td></tr>

                    <!-- Alert Banner -->
                    <tr>
                        <td style="padding:20px 36px 0;">
                            <div style="background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08));border:1px solid rgba(99,102,241,0.25);border-radius:12px;padding:16px 20px;display:flex;align-items:center;">
                                <span style="font-size:20px;margin-right:10px;">📬</span>
                                <div>
                                    <p style="color:#a5b4fc;font-size:13px;font-weight:600;margin:0 0 2px;">You have a new message!</p>
                                    <p style="color:#6366f1;font-size:11px;margin:0;">Submitted on ${submittedAt} IST</p>
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- Sender Details -->
                    <tr>
                        <td style="padding:24px 36px 0;">
                            <p style="color:#4a4a6a;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin:0 0 12px;">Sender Details</p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="50%" style="padding-right:8px;">
                                        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 16px;">
                                            <p style="color:#6366f1;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;margin:0 0 6px;">👤 Name</p>
                                            <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0;">${name}</p>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding-left:8px;">
                                        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 16px;">
                                            <p style="color:#ec4899;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;margin:0 0 6px;">✉️ Email</p>
                                            <p style="color:#f9a8d4;font-size:13px;font-weight:500;margin:0;word-break:break-all;">${email}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Subject -->
                    <tr>
                        <td style="padding:14px 36px 0;">
                            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 16px;">
                                <p style="color:#f59e0b;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;margin:0 0 6px;">📋 Subject</p>
                                <p style="color:#ffffff;font-size:15px;font-weight:600;margin:0;">${subject || '(No subject)'}</p>
                            </div>
                        </td>
                    </tr>

                    <!-- Message -->
                    <tr>
                        <td style="padding:14px 36px 0;">
                            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;">
                                <p style="color:#10b981;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;margin:0 0 12px;">💬 Message</p>
                                <p style="color:#c4c4d0;font-size:14px;line-height:1.8;margin:0;white-space:pre-wrap;">${message}</p>
                            </div>
                        </td>
                    </tr>

                    <!-- Reply CTA -->
                    <tr>
                        <td style="padding:24px 36px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || 'Your message to ServerChat')}" 
                                           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:14px;padding:14px 36px;border-radius:12px;text-decoration:none;box-shadow:0 4px 20px rgba(99,102,241,0.35);letter-spacing:0.3px;">
                                            ↩ Reply to ${name}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:16px 36px 24px;border-top:1px solid rgba(255,255,255,0.04);text-align:center;">
                            <p style="color:#3a3a4e;font-size:11px;margin:0;">This message was sent via the ServerChat Contact Form at <a href="https://server-chat-chi.vercel.app/contact" style="color:#6366f1;text-decoration:none;">server-chat-chi.vercel.app</a></p>
                            <p style="color:#2a2a3e;font-size:10px;margin:6px 0 0;">© 2026 ServerChat · Secure · Fast · Global</p>
                        </td>
                    </tr>
                </table>

                <!-- Bottom accent -->
                <div style="width:100%;max-width:520px;height:2px;background:linear-gradient(90deg,transparent,#6366f1,#8b5cf6,#ec4899,transparent);border-radius:4px;margin-top:24px;opacity:0.5;"></div>
            </td>
        </tr>
    </table>
</body>
</html>`,
        });

        if (error) {
            logger.error(`Contact email error: ${JSON.stringify(error)}`);
            return false;
        }

        logger.info(`Contact email from ${email} sent to admin (ID: ${data?.id})`);
        return true;
    } catch (err) {
        logger.error(`Failed to send contact email: ${err.message}`);
        return false;
    }
};
