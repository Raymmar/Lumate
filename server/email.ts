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