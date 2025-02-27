import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<boolean> {
  try {
    console.log('Sending verification email to:', email);
    const verificationUrl = `${process.env.APP_URL}/verify?token=${token}`;
    
    await mailService.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
      subject: 'Verify Your Profile Claim',
      text: `Click the following link to verify your profile: ${verificationUrl}`,
      html: `
        <div>
          <h2>Verify Your Profile</h2>
          <p>Click the button below to verify your profile claim:</p>
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
