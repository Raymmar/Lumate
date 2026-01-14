import { MailService } from '@sendgrid/mail';

const isDevelopment = process.env.NODE_ENV !== 'production';
const mailService = new MailService();

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;

// Get the base URL for email links - must be set via APP_URL environment variable
function getEmailBaseUrl(): string {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new Error('APP_URL environment variable must be set for email links');
  }
  return appUrl.replace(/\/$/, '');
}

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

// Generate email template based on follow-up stage
function getEmailTemplate(
  emailStage: number, 
  verificationUrl: string, 
  eventInfo?: { title: string; url: string; startTime: string }
): { subject: string; htmlContent: string; textContent: string } {
  let subject: string;
  let htmlContent: string;
  let textContent: string;

  // Format event section if event info is provided
  const eventSection = eventInfo ? `
    <div style="margin-top:30px;padding:20px;background:#f5f5f5;border-left:4px solid #0070f3;">
      <h3 style="margin-top:0;">Join us at our next event!</h3>
      <p style="margin:10px 0;"><strong>${eventInfo.title}</strong></p>
      <p style="margin:10px 0;">Date: ${new Date(eventInfo.startTime).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
        timeZoneName: 'short'
      })}</p>
      <a href="${eventInfo.url}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;margin-top:10px;">
        View Event & Register
      </a>
    </div>
  ` : '';

  const eventTextSection = eventInfo ? `\n\nJoin us at our next event: ${eventInfo.title} on ${new Date(eventInfo.startTime).toLocaleDateString('en-US')}. Register at: ${eventInfo.url}` : '';

  switch (emailStage) {
    case 0: // Initial email
      subject = 'Your Sarasota Tech member profile is ready to claim';
      htmlContent = `
        <div>
          <h2>Welcome to Sarasota Tech!</h2>
          <p>You've been added to the Sarasota Tech online directory. We're excited to have you as part of our tech community!</p>
          <p>Click the button below to claim your profile, set your password, and add your bio:</p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
            Claim Your Profile
          </a>
          <p style="margin-top:20px">Or copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
          <p style="margin-top:20px">Once you've set your password, you can upgrade to a premium listing to showcase your company and expertise.</p>
          ${eventSection}
        </div>
      `;
      textContent = `Welcome to Sarasota Tech! You've been added to the Sarasota Tech online directory. Click the following link to claim your profile and set your password: ${verificationUrl}${eventTextSection}`;
      break;

    case 1: // 24-hour follow-up
      subject = 'Reminder: Your Sarasota Tech profile is waiting';
      htmlContent = `
        <div>
          <h2>Don't forget to claim your Sarasota Tech profile</h2>
          <p>Yesterday, we sent you an invitation to claim your profile in the Sarasota Tech directory.</p>
          <p>It only takes a minute to set up your password and add your information:</p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
            Claim Profile Now
          </a>
          <p style="margin-top:20px">Link: ${verificationUrl}</p>
        </div>
      `;
      textContent = `Reminder: Your Sarasota Tech profile is waiting. Click here to claim it: ${verificationUrl}`;
      break;

    case 2: // 36-hour follow-up
      subject = "Quick reminder: Set up your Sarasota Tech profile";
      htmlContent = `
        <div>
          <h2>Your Sarasota Tech profile is still available</h2>
          <p>Just a quick reminder that your profile in the Sarasota Tech directory is ready for you to claim.</p>
          <p>Take a moment to set it up:</p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
            Set Up Profile
          </a>
          <p style="margin-top:20px">${verificationUrl}</p>
        </div>
      `;
      textContent = `Quick reminder: Your Sarasota Tech profile is ready. Set it up here: ${verificationUrl}`;
      break;

    case 3: // 7-day follow-up
      subject = 'Your Sarasota Tech profile is still available';
      htmlContent = `
        <div>
          <h2>It's been a week - your profile is still waiting</h2>
          <p>We noticed you haven't claimed your Sarasota Tech profile yet. As a member of our community, having your profile helps others connect with you.</p>
          <p>Benefits of claiming your profile:</p>
          <ul>
            <li>Be discoverable in our member directory</li>
            <li>Showcase your expertise and projects</li>
            <li>Connect with other tech professionals</li>
            <li>Option to upgrade for a full company listing</li>
          </ul>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
            Claim Your Profile
          </a>
          <p style="margin-top:20px">${verificationUrl}</p>
        </div>
      `;
      textContent = `It's been a week - your Sarasota Tech profile is still available. Claim it here: ${verificationUrl}`;
      break;

    case 4: // 14-day follow-up
      subject = 'Two weeks later: Your Sarasota Tech profile';
      htmlContent = `
        <div>
          <h2>Your Sarasota Tech profile has been waiting for 2 weeks</h2>
          <p>We'd love to have you active in the Sarasota Tech directory. Your fellow community members want to connect with you!</p>
          <p>It only takes 30 seconds to claim your profile:</p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
            Activate Profile
          </a>
          <p style="margin-top:20px">${verificationUrl}</p>
        </div>
      `;
      textContent = `Two weeks later: Your Sarasota Tech profile is still available. Activate it here: ${verificationUrl}`;
      break;

    case 5: // Monthly follow-up
      subject = 'Monthly reminder: Claim your Sarasota Tech profile';
      htmlContent = `
        <div>
          <h2>Monthly Reminder</h2>
          <p>This is your monthly reminder that you have a profile waiting in the Sarasota Tech directory.</p>
          <p>When you're ready, click below to claim it:</p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
            Claim Profile
          </a>
          <p style="margin-top:20px">${verificationUrl}</p>
        </div>
      `;
      textContent = `Monthly reminder: Your Sarasota Tech profile is waiting. Claim it here: ${verificationUrl}`;
      break;

    default: // Final message (90+ days)
      subject = 'Final notice: Your Sarasota Tech profile';
      htmlContent = `
        <div>
          <h2>Final Notice</h2>
          <p>This is our final automated reminder about your Sarasota Tech profile.</p>
          <p>We won't send any more automatic emails, but your profile will remain available.</p>
          <p>If you'd like to claim it in the future, you can always request a new verification link at our website using this email address: <strong>${verificationUrl.split('?')[0].replace('/verify', '')}</strong></p>
          <p>We hope to see you in the directory someday!</p>
        </div>
      `;
      textContent = `Final notice: This is our last automated reminder. You can always claim your profile later by requesting a new link at our website.`;
      break;
  }

  return { subject, htmlContent, textContent };
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  adminCreated: boolean = false,
  emailStage: number = -1, // -1 means use the old template
  eventInfo?: { title: string; url: string; startTime: string }
): Promise<boolean> {
  try {
    console.log('Sending verification email to:', email, adminCreated ? '(admin-created account)' : '', 'Stage:', emailStage, 'Has event:', !!eventInfo);
    const verificationUrl = `${getEmailBaseUrl()}/verify?token=${token}`;

    // In development, just log the verification URL
    if (isDevelopment && !process.env.SENDGRID_API_KEY) {
      console.log('Development mode - Email would have been sent with:', {
        to: email,
        verificationUrl,
        adminCreated,
        emailStage,
        eventInfo
      });
      return true;
    }

    // Add debug logging similar to sendPasswordResetEmail
    console.log('Email configuration:', {
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      fromEmail: FROM_EMAIL,
      isDevelopment,
      verificationUrl,
      adminCreated,
      emailStage,
      hasEvent: !!eventInfo
    });

    let subject: string;
    let htmlContent: string;
    let textContent: string;

    // Use new template system for staged emails, otherwise use legacy templates
    if (emailStage >= 0) {
      const template = getEmailTemplate(emailStage, verificationUrl, eventInfo);
      subject = template.subject;
      htmlContent = template.htmlContent;
      textContent = template.textContent;
    } else {
      // Legacy template for backward compatibility
      subject = adminCreated 
        ? 'Your Sarasota Tech member profile is ready to claim' 
        : 'Verify your Sarasota Tech member profile';

      const eventSection = eventInfo ? `
        <div style="margin-top:30px;padding:20px;background:#f5f5f5;border-left:4px solid #0070f3;">
          <h3 style="margin-top:0;">Join us at our next event!</h3>
          <p style="margin:10px 0;"><strong>${eventInfo.title}</strong></p>
          <p style="margin:10px 0;">Date: ${new Date(eventInfo.startTime).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/New_York',
            timeZoneName: 'short'
          })}</p>
          <a href="${eventInfo.url}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;margin-top:10px;">
            View Event & Register
          </a>
        </div>
      ` : '';

      const eventTextSection = eventInfo ? `\n\nJoin us at our next event: ${eventInfo.title} on ${new Date(eventInfo.startTime).toLocaleDateString('en-US')}. Register at: ${eventInfo.url}` : '';

      htmlContent = adminCreated 
        ? `
          <div>
            <h2>Your Sarasota Tech Member Profile is Ready</h2>
            <p>An administrator has created a member profile for you on the Sarasota Tech platform.</p>
            <p>Click the button below to claim your profile and set your password:</p>
            <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
              Claim Profile
            </a>
            <p style="margin-top:20px">Or copy and paste this link in your browser:</p>
            <p>${verificationUrl}</p>
            ${eventSection}
          </div>
        `
        : `
          <div>
            <h2>Verify Your Sarasota Tech Member Profile</h2>
            <p>Click the button below to verify your Sarasota Tech member profile:</p>
            <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
              Verify Profile
            </a>
            <p style="margin-top:20px">Or copy and paste this link in your browser:</p>
            <p>${verificationUrl}</p>
            ${eventSection}
          </div>
        `;

      textContent = adminCreated
        ? `An administrator has created a member profile for you on the Sarasota Tech platform. Click the following link to claim your profile and set your password: ${verificationUrl}${eventTextSection}`
        : `Click the following link to verify your Sarasota Tech member profile: ${verificationUrl}${eventTextSection}`;
    }

    console.log('Attempting to send verification email with message:', {
      to: email,
      from: FROM_EMAIL,
      subject,
      adminCreated,
      emailStage
    });

    await mailService.send({
      to: email,
      from: FROM_EMAIL,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('SendGrid API Response:', {
      statusCode: 'Success',
      headers: null,
      email: email,
      adminCreated,
      emailStage
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

export async function sendCouponNotificationEmail(
  email: string,
  couponInfo: {
    eventTitle: string;
    discountPercent: number;
    registrationLink: string;
    expirationDate?: string;
  }
): Promise<boolean> {
  try {
    console.log('Sending coupon notification email to:', email, 'for event:', couponInfo.eventTitle);

    // In development, just log the details
    if (isDevelopment && !process.env.SENDGRID_API_KEY) {
      console.log('Development mode - Coupon notification email would have been sent with:', {
        to: email,
        couponInfo
      });
      return true;
    }

    console.log('Email configuration:', {
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      fromEmail: FROM_EMAIL,
      isDevelopment,
      eventTitle: couponInfo.eventTitle
    });

    const expirationNote = couponInfo.expirationDate 
      ? `<p style="margin-top:10px;color:#666;font-size:14px;">This offer expires on ${new Date(couponInfo.expirationDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}.</p>`
      : '';

    const expirationTextNote = couponInfo.expirationDate 
      ? ` This offer expires on ${new Date(couponInfo.expirationDate).toLocaleDateString('en-US')}.`
      : '';

    const subject = `You have a ticket to claim for ${couponInfo.eventTitle}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">You've Got a Ticket to Claim!</h2>
        
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Great news! As a valued Sarasota Tech member, you have an exclusive ${couponInfo.discountPercent}% discount ticket waiting for you for:
        </p>
        
        <div style="background: linear-gradient(to right, #ecfdf5, #d1fae5); border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px;">${couponInfo.eventTitle}</h3>
          <p style="margin: 0; color: #047857; font-weight: 600; font-size: 18px;">${couponInfo.discountPercent}% Off</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${couponInfo.registrationLink}" 
             style="display: inline-block; padding: 16px 32px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
            Click to Register with Your Discount
          </a>
        </div>

        ${expirationNote}

        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Important:</strong> This is your personal, unique registration link. Please do not share it with others, as it can only be used once.
          </p>
        </div>

        <p style="font-size: 14px; color: #666; line-height: 1.6;">
          You can also access this coupon anytime by logging into your Sarasota Tech account and visiting your Settings page under "Your Event Coupons."
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="font-size: 12px; color: #9ca3af;">
          If the button above doesn't work, copy and paste this link into your browser:<br>
          <a href="${couponInfo.registrationLink}" style="color: #16a34a; word-break: break-all;">${couponInfo.registrationLink}</a>
        </p>
      </div>
    `;

    const textContent = `You've Got a Ticket to Claim!

Great news! As a valued Sarasota Tech member, you have an exclusive ${couponInfo.discountPercent}% discount ticket waiting for you for: ${couponInfo.eventTitle}

Click here to register with your discount: ${couponInfo.registrationLink}

${expirationTextNote}

IMPORTANT: This is your personal, unique registration link. Please do not share it with others, as it can only be used once.

You can also access this coupon anytime by logging into your Sarasota Tech account and visiting your Settings page under "Your Event Coupons."`;

    console.log('Attempting to send coupon notification email with message:', {
      to: email,
      from: FROM_EMAIL,
      subject
    });

    await mailService.send({
      to: email,
      from: FROM_EMAIL,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('Coupon notification email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Failed to send coupon notification email:', error);
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

export async function sendEventInviteEmail(
  email: string,
  eventInfo: { title: string; url: string; startTime: string }
): Promise<boolean> {
  try {
    console.log('Sending event invite email to:', email, 'for event:', eventInfo.title);

    if (isDevelopment && !process.env.SENDGRID_API_KEY) {
      console.log('Development mode - Event invite email would have been sent with:', {
        to: email,
        eventInfo
      });
      return true;
    }

    console.log('Email configuration:', {
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      fromEmail: FROM_EMAIL,
      isDevelopment,
      eventTitle: eventInfo.title
    });

    const eventDate = new Date(eventInfo.startTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
      timeZoneName: 'short'
    });

    const subject = `You're invited to ${eventInfo.title}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Sarasota Tech!</h2>
        
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Thanks for signing up! We're excited to have you join our growing tech community.
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          You've been added to our community and will receive updates about upcoming events and opportunities.
        </p>
        
        <div style="background: linear-gradient(to right, #eff6ff, #dbeafe); border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 18px;">Join us at our next event!</h3>
          <p style="margin: 5px 0; color: #1e3a8a; font-weight: 600; font-size: 20px;">${eventInfo.title}</p>
          <p style="margin: 10px 0 0 0; color: #3730a3;">${eventDate}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${eventInfo.url}" 
             style="display: inline-block; padding: 16px 32px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
            View Event & Register
          </a>
        </div>

        <p style="font-size: 14px; color: #666; line-height: 1.6;">
          Click the button above to see the full event details and register. We look forward to seeing you there!
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="font-size: 12px; color: #9ca3af;">
          If the button above doesn't work, copy and paste this link into your browser:<br>
          <a href="${eventInfo.url}" style="color: #0070f3; word-break: break-all;">${eventInfo.url}</a>
        </p>
      </div>
    `;

    const textContent = `Welcome to Sarasota Tech!

Thanks for signing up! We're excited to have you join our growing tech community.

You've been added to our community and will receive updates about upcoming events and opportunities.

Join us at our next event: ${eventInfo.title}
Date: ${eventDate}

View event and register: ${eventInfo.url}

We look forward to seeing you there!`;

    console.log('Attempting to send event invite email with message:', {
      to: email,
      from: FROM_EMAIL,
      subject
    });

    await mailService.send({
      to: email,
      from: FROM_EMAIL,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('Event invite email sent successfully to:', email);
    return true;
  } catch (error: any) {
    console.error('Failed to send event invite email:', error);
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
    const resetUrl = `${getEmailBaseUrl()}/reset-password?token=${token}`;

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