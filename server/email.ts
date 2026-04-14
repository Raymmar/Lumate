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
  adminCreated: boolean | string = false,
  emailStage: number = -1, // -1 means use the old template
  eventInfo?: { title: string; url: string; startTime: string }
): Promise<boolean> {
  try {
    const purpose = typeof adminCreated === 'string' ? adminCreated : (adminCreated ? 'admin' : 'claim');
    console.log('Sending verification email to:', email, 'Purpose:', purpose, 'Stage:', emailStage, 'Has event:', !!eventInfo);

    const verifyPath = purpose === 'link' ? '/verify?type=link&token=' : '/verify?token=';
    const verificationUrl = `${getEmailBaseUrl()}${verifyPath}${token}`;

    if (purpose === 'link') {
      if (isDevelopment && !process.env.SENDGRID_API_KEY) {
        console.log('Development mode - Link verification email would have been sent:', { to: email, verificationUrl });
        return true;
      }

      const subject = 'Confirm your Luma profile link - Sarasota Tech';
      const htmlContent = `
        <div>
          <h2>Confirm Your Profile Link</h2>
          <p>Someone requested to link a Luma profile associated with this email to their Sarasota Tech account.</p>
          <p>If this was you, click the button below to confirm:</p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">
            Confirm Link
          </a>
          <p style="margin-top:20px">Or copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
          <p style="margin-top:20px;color:#666;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `;
      const textContent = `Someone requested to link a Luma profile associated with this email to their Sarasota Tech account. If this was you, click this link to confirm: ${verificationUrl}`;

      await mailService.send({
        to: email,
        from: FROM_EMAIL!,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log('Link verification email sent to:', email);
      return true;
    }

    const isAdminCreated = purpose === 'admin';

    // In development, just log the verification URL
    if (isDevelopment && !process.env.SENDGRID_API_KEY) {
      console.log('Development mode - Email would have been sent with:', {
        to: email,
        verificationUrl,
        purpose,
        emailStage,
        eventInfo
      });
      return true;
    }

    console.log('Email configuration:', {
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      fromEmail: FROM_EMAIL,
      isDevelopment,
      verificationUrl,
      purpose,
      emailStage,
      hasEvent: !!eventInfo
    });

    let subject: string;
    let htmlContent: string;
    let textContent: string;

    if (emailStage >= 0) {
      const template = getEmailTemplate(emailStage, verificationUrl, eventInfo);
      subject = template.subject;
      htmlContent = template.htmlContent;
      textContent = template.textContent;
    } else {
      subject = isAdminCreated 
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

      htmlContent = isAdminCreated 
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

      textContent = isAdminCreated
        ? `An administrator has created a member profile for you on the Sarasota Tech platform. Click the following link to claim your profile and set your password: ${verificationUrl}${eventTextSection}`
        : `Click the following link to verify your Sarasota Tech member profile: ${verificationUrl}${eventTextSection}`;
    }

    console.log('Attempting to send verification email with message:', {
      to: email,
      from: FROM_EMAIL,
      subject,
      purpose,
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
      purpose,
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

export async function sendEmailDriftNotification(
  accountEmail: string,
  driftedPersonEmail: string,
): Promise<boolean> {
  try {
    const settingsUrl = `${getEmailBaseUrl()}/settings`;

    if (isDevelopment && !process.env.SENDGRID_API_KEY) {
      console.log('Development mode - Drift notification email would have been sent:', {
        to: [accountEmail, driftedPersonEmail],
        settingsUrl,
      });
      return true;
    }

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#333;">Action Needed: Your Sarasota Tech Profile</h2>
        <p>We noticed that your linked Luma profile email has changed.</p>
        <div style="margin:20px 0;padding:15px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;">
          <p style="margin:0 0 8px 0;"><strong>Account email:</strong> ${accountEmail}</p>
          <p style="margin:0;"><strong>Luma profile email:</strong> ${driftedPersonEmail}</p>
        </div>
        <p>To keep your account in sync, please visit your settings and choose one of the following:</p>
        <ul style="color:#555;">
          <li>Update your account email to match your Luma profile</li>
          <li>Link both email profiles to your account</li>
          <li>Dismiss if everything looks correct</li>
        </ul>
        <a href="${settingsUrl}" style="display:inline-block;padding:12px 24px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;margin-top:10px;">
          Go to Settings
        </a>
        <p style="margin-top:30px;color:#999;font-size:12px;">
          If you didn't expect this email, you can safely ignore it or contact us at info@sarasota.tech
        </p>
      </div>
    `;

    const recipients = [accountEmail];
    if (driftedPersonEmail.toLowerCase() !== accountEmail.toLowerCase()) {
      recipients.push(driftedPersonEmail);
    }

    for (const recipient of recipients) {
      const msg = {
        to: recipient,
        from: FROM_EMAIL,
        subject: 'Action Needed: Your Sarasota Tech profile email has changed',
        text: `Your linked Luma profile email has changed from ${accountEmail} to ${driftedPersonEmail}. Visit ${settingsUrl} to update your account.`,
        html: htmlContent,
      };
      await mailService.send(msg);
    }

    console.log('Drift notification sent to:', recipients);
    return true;
  } catch (error: any) {
    console.error('Failed to send drift notification email:', error.message);
    return false;
  }
}

function getVideoThumbnailAndUrl(videoUrl: string | null): { thumbnailUrl: string; videoLink: string } | null {
  if (!videoUrl) return null;
  try {
    const url = new URL(videoUrl);
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      const videoId = url.hostname.includes('youtu.be')
        ? url.pathname.slice(1)
        : url.searchParams.get('v');
      if (videoId) {
        return {
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          videoLink: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }
    }
    if (url.hostname.includes('vimeo.com')) {
      const videoId = url.pathname.split('/').pop();
      if (videoId) {
        return {
          thumbnailUrl: `https://vumbnail.com/${videoId}.jpg`,
          videoLink: `https://vimeo.com/${videoId}`,
        };
      }
    }
  } catch {}
  return null;
}

export async function sendNewsletterEmail(
  email: string,
  postData: {
    title: string;
    summary: string | null;
    body: string;
    featuredImage: string | null;
    videoUrl: string | null;
    ctaLink: string | null;
    ctaLabel: string | null;
  }
): Promise<boolean> {
  try {
    const baseUrl = getEmailBaseUrl();

    if (isDevelopment && !process.env.SENDGRID_API_KEY) {
      console.log('Development mode - Newsletter email would have been sent:', {
        to: email,
        postTitle: postData.title,
      });
      return true;
    }

    const featuredImageSection = postData.featuredImage
      ? `<img src="${postData.featuredImage}" alt="${postData.title}" style="width:100%;max-width:600px;height:auto;border-radius:8px;margin-bottom:24px;" />`
      : '';

    const videoInfo = getVideoThumbnailAndUrl(postData.videoUrl);
    const videoSection = videoInfo
      ? `<div style="margin-bottom:24px;position:relative;">
          <a href="${videoInfo.videoLink}" target="_blank" style="display:block;text-decoration:none;">
            <img src="${videoInfo.thumbnailUrl}" alt="Watch Video" style="width:100%;max-width:600px;height:auto;border-radius:8px;" />
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;background:rgba(0,0,0,0.7);border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <div style="width:0;height:0;border-style:solid;border-width:12px 0 12px 22px;border-color:transparent transparent transparent #fff;margin-left:4px;"></div>
            </div>
          </a>
        </div>`
      : '';

    const ctaSection = postData.ctaLink && postData.ctaLabel
      ? `<div style="text-align:center;margin:30px 0;">
          <a href="${postData.ctaLink.startsWith('http') ? postData.ctaLink : baseUrl + postData.ctaLink}"
             style="display:inline-block;padding:14px 28px;background-color:#FEA30E;color:#000;text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold;">
            ${postData.ctaLabel}
          </a>
        </div>`
      : '';

    const summarySection = postData.summary
      ? `<p style="font-size:16px;color:#666;line-height:1.6;margin:0 0 24px 0;font-style:italic;">${postData.summary}</p>`
      : '';

    const subject = postData.title;

    const logoUrl = `${baseUrl}/st-logo-email.png`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
          <div style="padding:16px 32px;text-align:center;border-bottom:1px solid #e5e5e5;">
            <img src="${logoUrl}" alt="Sarasota Tech" style="display:block;margin:0 auto;max-width:280px;width:100%;height:auto;" />
          </div>
          <div style="padding:32px;">
            ${featuredImageSection}
            ${videoSection}
            <h2 style="color:#1a1a1a;font-size:28px;line-height:1.3;margin:0 0 16px 0;">${postData.title}</h2>
            ${summarySection}
            <div style="color:#333;font-size:16px;line-height:1.7;">
              ${postData.body}
            </div>
            ${ctaSection}
          </div>
          <div style="padding:24px 32px;border-top:1px solid #e5e5e5;text-align:center;">
            <p style="margin:0 0 8px 0;color:#999;font-size:12px;">
              Sarasota Tech Community
            </p>
            <p style="margin:0;color:#999;font-size:12px;">
              <a href="${baseUrl}" style="color:#FEA30E;text-decoration:none;">Visit our website</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const bodyText = postData.body.replace(/<[^>]*>/g, '');
    const textContent = `${postData.title}\n\n${postData.summary || ''}\n\n${bodyText}\n\nVisit: ${baseUrl}`;

    await mailService.send({
      to: email,
      from: FROM_EMAIL!,
      subject,
      text: textContent,
      html: htmlContent,
    });

    return true;
  } catch (error: any) {
    console.error('Failed to send newsletter email to:', email, error.message);
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