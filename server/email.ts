import { MailService } from '@sendgrid/mail';

const isDevelopment = process.env.NODE_ENV !== 'production';
const mailService = new MailService();

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;

if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid API key configured successfully');
  console.log('Using sender email:', FROM_EMAIL);
} else if (!isDevelopment) {
  throw new Error("SENDGRID_API_KEY environment variable must be set in production");
} else {
  console.warn("SENDGRID_API_KEY not set. Email functionality will be mocked in development.");
}

if (!FROM_EMAIL) {
  throw new Error("SENDGRID_FROM_EMAIL environment variable must be set");
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

    // Add debug logging similar to sendPasswordResetEmail
    console.log('Email configuration:', {
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      fromEmail: FROM_EMAIL,
      isDevelopment,
      verificationUrl
    });

    console.log('Attempting to send verification email with message:', {
      to: email,
      from: FROM_EMAIL,
      subject: 'Verify your Sarasota Tech member profile'
    });


    await mailService.send({
      to: email,
      from: FROM_EMAIL,
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

    console.log('SendGrid API Response:', {
      statusCode: 'Success',
      headers: null,
      email: email
    });

    console.log('Verification email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    if (error.response) {
      console.error('SendGrid API Error:', {
        statusCode: error.response.statusCode,
        body: error.response.body,
        headers: error.response.headers,
      });
    }
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<boolean> {
  try {
    console.log('Starting password reset email process for:', email);
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // Log configuration details
    console.log('Email configuration:', {
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      fromEmail: FROM_EMAIL,
      isDevelopment,
      resetUrl
    });

    // In development, just log the reset URL
    if (isDevelopment && !process.env.SENDGRID_API_KEY) {
      console.log('Development mode - Password reset email would have been sent with:', {
        to: email,
        resetUrl,
      });
      return true;
    }

    const msg = {
      to: email,
      from: FROM_EMAIL,
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
    };

    // Add debug logging for the message being sent
    console.log('Attempting to send password reset email with message:', {
      to: email,
      from: FROM_EMAIL,
      subject: msg.subject
    });

    try {
      const [response] = await mailService.send(msg);
      console.log('SendGrid API Response:', {
        statusCode: response?.statusCode,
        headers: response?.headers,
        email: email
      });
      console.log('Password reset email sent successfully to:', email);
      return true;
    } catch (sendError: any) {
      console.error('SendGrid API Error:', {
        error: sendError.message,
        response: sendError.response?.body,
        code: sendError.code,
        email: email,
        errorName: sendError.name,
        errorStack: sendError.stack
      });
      throw sendError;
    }
  } catch (error: any) {
    console.error('Failed to send password reset email:', {
      error: error.message,
      code: error.code,
      response: error.response?.body,
      email: email
    });
    return false;
  }
}