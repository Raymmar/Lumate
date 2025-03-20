import { MailService } from '@sendgrid/mail';

const isDevelopment = process.env.NODE_ENV !== 'production';
const mailService = new MailService();

if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else if (!isDevelopment) {
  throw new Error("SENDGRID_API_KEY environment variable must be set in production");
} else {
  console.warn("SENDGRID_API_KEY not set. Email functionality will be mocked in development.");
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<boolean> {
  try {
    console.log('Sending verification email to:', email);
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify?token=${token}`;

    // In development, just log the verification URL
    if (isDevelopment && !process.env.SENDGRID_API_KEY) {
      console.log('Development mode - Email would have been sent with:', {
        to: email,
        verificationUrl,
      });
      return true;
    }

    await mailService.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
      subject: 'Verify your Sarasota Tech member profile',
      text: `Click the following link to verify your Sarasota Tech member profile: ${verificationUrl}`,
      html: `
        <div>
          <h2>Verify Your Sarasots Tech member profile</h2>
          <p>Click the button below to verify your Sarasota Tech member profile:</p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
            Verify Profile
          </a>
          <p style="margin-top:20px">Or copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
        </div>
      `,
    });

    console.log('Verification email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<boolean> {
  try {
    console.log('Sending password reset email to:', email);
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // In development, just log the reset URL
    if (isDevelopment && !process.env.SENDGRID_API_KEY) {
      console.log('Development mode - Password reset email would have been sent with:', {
        to: email,
        resetUrl,
      });
      return true;
    }

    await mailService.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
      subject: 'Reset your Sarasota Tech password',
      text: `Click the following link to reset your Sarasota Tech password: ${resetUrl}. This link will expire in 24 hours.`,
      html: `
        <div>
          <h2>Reset Your Sarasota Tech Password</h2>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
            Reset Password
          </a>
          <p style="margin-top:20px">Or copy and paste this link in your browser:</p>
          <p>${resetUrl}</p>
          <p style="margin-top:20px;color:#666;">This link will expire in 24 hours.</p>
          <p style="color:#666;">If you didn't request this password reset, you can safely ignore this email.</p>
        </div>
      `,
    });

    console.log('Password reset email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}