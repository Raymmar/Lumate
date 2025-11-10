import { storage } from '../storage';
import { sendVerificationEmail } from '../email';
import { Person } from '@shared/schema';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

export class EmailInvitationService {
  private static instance: EmailInvitationService;
  private readonly SYNC_INTERVAL = 60 * 60 * 1000; // Run every hour
  private serviceInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private dryRun: boolean = true; // SAFETY: Default to dry-run mode
  
  // AUTO-ENROLLMENT CUTOFF: Only auto-enroll people created after this date
  // This prevents mass-emailing existing historical records
  private readonly AUTO_ENROLL_CUTOFF_DATE = new Date('2025-11-10T00:00:00Z');
  
  // TEST MODE: Set to true to only process test emails
  private readonly TEST_MODE = false;
  private readonly TEST_EMAILS = [
    'test@raymmar.com',
    'testmore@raymmar.com'
  ];
  
  private constructor() {
    // In test mode, send real emails but only to test addresses
    if (this.TEST_MODE) {
      this.dryRun = false; // Send real emails to test addresses
      console.log('[EmailInvitationService] Running in TEST MODE - emails will be sent ONLY to:', this.TEST_EMAILS.join(', '));
    } else {
      // LIVE mode - emails send only when manually triggered
      this.dryRun = false;
      console.log('[EmailInvitationService] Running in LIVE mode - emails will be sent when manually triggered');
    }
  }

  public static getInstance(): EmailInvitationService {
    if (!EmailInvitationService.instance) {
      EmailInvitationService.instance = new EmailInvitationService();
    }
    return EmailInvitationService.instance;
  }

  // Calculate the next send time based on email count (adjusted to business hours)
  private calculateNextSendTime(emailsSentCount: number): Date | null {
    const now = new Date();
    const nextSend = new Date(now);

    // Calculate time to add based on email count
    let hoursToAdd: number;
    
    switch (emailsSentCount) {
      case 0: // Initial email - send immediately (will be adjusted to business hours)
        return this.adjustToBusinessHours(now);
      case 1: // 24 hours after initial
        hoursToAdd = 24;
        break;
      case 2: // 36 hours after initial
        hoursToAdd = 36;
        break;
      case 3: // 7 days after initial
        hoursToAdd = 7 * 24;
        break;
      case 4: // 14 days after initial
        hoursToAdd = 14 * 24;
        break;
      default: // Monthly thereafter (up to 90 days)
        if (emailsSentCount >= 7) {
          return null; // Stop sending after 7 emails
        }
        hoursToAdd = 30 * 24;
        break;
    }

    // Add the hours from NOW
    nextSend.setHours(nextSend.getHours() + hoursToAdd);
    
    // Adjust to next business hour (9 AM - 7 PM EST, weekdays only)
    return this.adjustToBusinessHours(nextSend);
  }

  // Get the appropriate email subject based on email count
  private getEmailSubject(emailsSentCount: number): string {
    switch (emailsSentCount) {
      case 0:
        return 'Your Sarasota Tech member profile is ready to claim';
      case 1:
        return 'Reminder: Your Sarasota Tech profile is waiting';
      case 2:
        return "Don't miss out on your Sarasota Tech membership";
      case 3:
        return 'Your Sarasota Tech profile is still available';
      case 4:
        return 'Last chance to easily claim your Sarasota Tech profile';
      default:
        if (emailsSentCount >= 7) {
          return 'Final notice: Your Sarasota Tech profile';
        }
        return 'Monthly reminder: Claim your Sarasota Tech profile';
    }
  }

  // Check if we're in the sending window (9 AM - 7 PM Eastern, weekdays only)
  private isInSendingWindow(): boolean {
    const now = new Date();
    const easternTz = 'America/New_York';
    
    // Get hour (0-23) and day of week (1-7, where 1=Monday, 7=Sunday) in Eastern timezone
    const hour = Number(formatInTimeZone(now, easternTz, 'H'));
    const day = Number(formatInTimeZone(now, easternTz, 'i'));
    
    // Check if it's a weekday (Monday-Friday = 1-5) and within business hours (9 AM - 7 PM)
    const isWeekday = day >= 1 && day <= 5;
    const isBusinessHours = hour >= 9 && hour < 19;
    
    return isWeekday && isBusinessHours;
  }

  // Adjust a date to the next available business hour (9 AM - 7 PM EST, weekdays)
  private adjustToBusinessHours(date: Date): Date {
    const easternTz = 'America/New_York';
    
    // Get Eastern day of week (1=Monday, 7=Sunday) and hour (0-23)
    const day = Number(formatInTimeZone(date, easternTz, 'i'));
    const hour = Number(formatInTimeZone(date, easternTz, 'H'));
    
    // Already in business hours (weekday 9am-7pm)?
    if (day >= 1 && day <= 5 && hour >= 9 && hour < 19) {
      return date;
    }
    
    // Determine how many days to advance
    let daysToAdd = 0;
    
    if (day === 7) { // Sunday
      daysToAdd = 1; // Move to Monday
    } else if (day === 6) { // Saturday
      daysToAdd = 2; // Move to Monday
    } else if (hour >= 19) { // After 7 PM on weekday
      if (day === 5) { // Friday after hours
        daysToAdd = 3; // Move to Monday
      } else {
        daysToAdd = 1; // Move to next weekday
      }
    } else if (hour < 9) { // Before 9 AM on weekday
      daysToAdd = 0; // Stay on same day, just adjust to 9 AM
    }
    
    // Build the target date in Eastern time as "YYYY-MM-DDT09:00:00"
    let candidate = date;
    if (daysToAdd > 0) {
      candidate = addDays(candidate, daysToAdd);
    }
    
    // Format the candidate date in Eastern time and construct 9 AM Eastern string
    const easternDateStr = formatInTimeZone(candidate, easternTz, 'yyyy-MM-dd');
    const targetEasternStr = `${easternDateStr}T09:00:00`;
    
    // Convert the "9 AM Eastern" string back to UTC
    return fromZonedTime(targetEasternStr, easternTz);
  }

  // Process new people who don't have invitations yet
  private async processNewPeople(): Promise<void> {
    try {
      let unclaimedPeople = await storage.getUnclaimedPeople();
      console.log(`[EmailInvitation] Found ${unclaimedPeople.length} unclaimed people`);
      
      // Filter to only people created after the cutoff date (prevents mass-emailing legacy records)
      unclaimedPeople = unclaimedPeople.filter(person => {
        if (!person.createdAt) return false; // Skip if no creation date
        const createdDate = new Date(person.createdAt);
        return createdDate >= this.AUTO_ENROLL_CUTOFF_DATE;
      });
      console.log(`[EmailInvitation] Filtered to ${unclaimedPeople.length} people created after ${this.AUTO_ENROLL_CUTOFF_DATE.toISOString()}`);
      
      // Filter to only test emails if in TEST_MODE
      if (this.TEST_MODE) {
        unclaimedPeople = unclaimedPeople.filter(person => 
          this.TEST_EMAILS.includes(person.email)
        );
        console.log(`[EmailInvitation] TEST MODE: Filtered to ${unclaimedPeople.length} test emails`);
      }

      // Get the next upcoming public event to include in emails
      let nextEvent = null;
      try {
        const futureEvents = await storage.getFutureEvents();
        if (futureEvents.length > 0) {
          nextEvent = futureEvents[0]; // Get the soonest upcoming event
          console.log(`[EmailInvitation] Found next event: ${nextEvent.title} (${nextEvent.url})`);
        } else {
          console.log(`[EmailInvitation] No upcoming events found`);
        }
      } catch (error) {
        console.error('[EmailInvitation] Error fetching next event:', error);
      }

      // Prepare event info for email if available
      const eventInfo = nextEvent ? {
        title: nextEvent.title,
        url: nextEvent.url || '',
        startTime: nextEvent.startTime
      } : undefined;
      
      for (const person of unclaimedPeople) {
        // Check if we already have an invitation for this person
        const existingInvitation = await storage.getEmailInvitationByPersonId(person.id);
        
        if (!existingInvitation) {
          console.log(`[EmailInvitation] Creating new invitation for ${person.email}`);
          
          // Create verification token
          const verificationToken = await storage.createVerificationToken(person.email);
          
          // Send initial email (stage 0)
          let emailSent = false;
          if (this.dryRun) {
            console.log(`[EmailInvitation] DRY RUN: Would send initial email to ${person.email} with event: ${eventInfo?.title || 'none'}`);
            emailSent = true; // Simulate success in dry-run mode
          } else {
            emailSent = await sendVerificationEmail(
              person.email, 
              verificationToken.token, 
              true, // adminCreated flag
              0, // emailStage for initial email
              eventInfo // Include event info in email
            );
          }
          
          if (emailSent) {
            // Create invitation record
            const nextSendAt = this.calculateNextSendTime(1); // Calculate next send time for follow-up
            
            await storage.createEmailInvitation({
              personId: person.id,
              emailsSentCount: 1,
              lastSentAt: new Date().toISOString(),
              nextSendAt: nextSendAt ? nextSendAt.toISOString() : null,
              optedOut: false,
              finalMessageSent: false
            });
            
            console.log(`[EmailInvitation] Successfully sent initial email to ${person.email}`);
          } else {
            console.error(`[EmailInvitation] Failed to send initial email to ${person.email}`);
          }
        }
      }
    } catch (error) {
      console.error('[EmailInvitation] Error processing new people:', error);
    }
  }

  // Detect and mark claimed accounts (runs 24/7 every hour)
  private async detectClaimedAccounts(): Promise<void> {
    try {
      // Get all active invitations (not completed, not opted out)
      let activeInvitations = await storage.getActiveEmailInvitations();
      console.log(`[EmailInvitation] Checking ${activeInvitations.length} active invitations for claimed accounts`);
      
      // Filter to only test emails if in TEST_MODE
      if (this.TEST_MODE) {
        activeInvitations = activeInvitations.filter(invitation => 
          this.TEST_EMAILS.includes(invitation.person.email)
        );
        console.log(`[EmailInvitation] TEST MODE: Filtered to ${activeInvitations.length} test emails for claim detection`);
      }
      
      for (const invitation of activeInvitations) {
        const { person } = invitation;
        
        // Check if person now has a verified user account (claimed)
        const user = await storage.getUserByEmail(person.email);
        if (user && user.isVerified) {
          console.log(`[EmailInvitation] ${person.email} has claimed their account, marking as complete`);
          
          // Mark invitation as completed
          await storage.updateEmailInvitation(invitation.id, {
            completedAt: new Date().toISOString(),
            nextSendAt: null // Stop future sends
          });
        }
      }
    } catch (error) {
      console.error('[EmailInvitation] Error detecting claimed accounts:', error);
    }
  }

  // Send follow-up emails (runs immediately when triggered)
  private async sendFollowUpEmails(): Promise<void> {
    try {
      // Check if we're in the sending window before processing
      if (!this.isInSendingWindow()) {
        console.log('[EmailInvitation] Outside business hours - skipping follow-up emails');
        return;
      }
      
      let dueInvitations = await storage.getEmailInvitationsDueForSending();
      console.log(`[EmailInvitation] Found ${dueInvitations.length} invitations due for follow-up`);
      
      // Filter to only test emails if in TEST_MODE
      if (this.TEST_MODE) {
        dueInvitations = dueInvitations.filter(invitation => 
          this.TEST_EMAILS.includes(invitation.person.email)
        );
        console.log(`[EmailInvitation] TEST MODE: Filtered to ${dueInvitations.length} test email follow-ups`);
      }

      for (const invitation of dueInvitations) {
        const { person } = invitation;
        
        // Double-check if person has claimed since last check
        const user = await storage.getUserByEmail(person.email);
        if (user && user.isVerified) {
          console.log(`[EmailInvitation] ${person.email} has claimed their account, skipping email`);
          // The detectClaimedAccounts() should have already marked this, but just in case
          await storage.updateEmailInvitation(invitation.id, {
            completedAt: new Date().toISOString(),
            nextSendAt: null
          });
          continue;
        }
        
        // Check if we should send final message (90+ days)
        if (invitation.emailsSentCount >= 6) { // After initial + follow-ups
          // Send final message
          await this.sendFinalMessage(invitation, person);
          continue;
        }
        
        // Create new verification token for follow-up
        const verificationToken = await storage.createVerificationToken(person.email);
        
        // Send follow-up email with appropriate stage
        let emailSent = false;
        if (this.dryRun) {
          console.log(`[EmailInvitation] DRY RUN: Would send follow-up #${invitation.emailsSentCount + 1} to ${person.email}`);
          emailSent = true; // Simulate success in dry-run mode
        } else {
          emailSent = await sendVerificationEmail(
            person.email, 
            verificationToken.token, 
            true, // adminCreated flag
            invitation.emailsSentCount // Use current count as stage
          );
        }
        
        if (emailSent) {
          const newCount = invitation.emailsSentCount + 1;
          const nextSendAt = this.calculateNextSendTime(newCount);
          
          // Update invitation record
          await storage.updateEmailInvitation(invitation.id, {
            emailsSentCount: newCount,
            lastSentAt: new Date().toISOString(),
            nextSendAt: nextSendAt ? nextSendAt.toISOString() : null
          });
          
          console.log(`[EmailInvitation] Sent follow-up #${newCount} to ${person.email}`);
        } else {
          console.error(`[EmailInvitation] Failed to send follow-up to ${person.email}`);
        }
      }
    } catch (error) {
      console.error('[EmailInvitation] Error sending follow-up emails:', error);
    }
  }

  // Send final message after 90 days
  private async sendFinalMessage(invitation: any, person: Person): Promise<void> {
    try {
      // In dry-run mode, just log what would happen
      if (this.dryRun) {
        console.log(`[EmailInvitation] DRY RUN: Would send final message to ${person.email}`);
      } else {
        // TODO: Implement actual final message email template
        console.log(`[EmailInvitation] Sending final message to ${person.email}`);
      }
      
      await storage.updateEmailInvitation(invitation.id, {
        finalMessageSent: true,
        lastSentAt: new Date().toISOString(),
        nextSendAt: null // No more emails
      });
      
      console.log(`[EmailInvitation] Marked final message sent for ${person.email}`);
    } catch (error) {
      console.error(`[EmailInvitation] Error sending final message to ${person.email}:`, error);
    }
  }

  // Comprehensive data reconciliation: sync users and invitations properly
  public async reconcileUserInvitations(): Promise<{
    created: number;
    completed: number;
    reset: number;
    enrolled: number;
    skipped: number;
    errors: number;
  }> {
    console.log('[EmailInvitation] Starting comprehensive user-invitation reconciliation...');
    
    const stats = { created: 0, completed: 0, reset: 0, enrolled: 0, skipped: 0, errors: 0 };
    
    try {
      // Get all users
      const allUsers = await storage.getAllUsers();
      console.log(`[EmailInvitation] Processing ${allUsers.length} total users`);
      
      for (const user of allUsers) {
        try {
          // Find the person record for this user
          const person = await storage.getPersonByEmail(user.email);
          if (!person) {
            console.log(`[EmailInvitation] No person record for ${user.email}, skipping`);
            stats.skipped++;
            continue;
          }
          
          // Get or create invitation record
          let invitation = await storage.getEmailInvitationByPersonId(person.id);
          
          if (!invitation) {
            // User has no invitation record - create one
            if (user.isVerified) {
              // Verified user - create completed invitation
              await storage.createEmailInvitation({
                personId: person.id,
                emailsSentCount: 0,
                lastSentAt: null,
                nextSendAt: null,
                optedOut: false,
                finalMessageSent: false,
                completedAt: new Date().toISOString()
              });
              console.log(`[EmailInvitation] Created completed invitation for verified user ${user.email}`);
              stats.created++;
              stats.completed++;
            } else {
              // Unverified user - create in-progress invitation and enroll in workflow
              const nextSendAt = this.calculateNextSendTime(0); // Will be adjusted to business hours
              await storage.createEmailInvitation({
                personId: person.id,
                emailsSentCount: 0,
                lastSentAt: null,
                nextSendAt: nextSendAt ? nextSendAt.toISOString() : null,
                optedOut: false,
                finalMessageSent: false,
                completedAt: null
              });
              console.log(`[EmailInvitation] Created in-progress invitation for unverified user ${user.email}`);
              stats.created++;
              stats.enrolled++;
            }
          } else {
            // Invitation exists - verify it's in correct state
            if (user.isVerified && !invitation.completedAt) {
              // User is verified but invitation not marked complete - fix it
              await storage.updateEmailInvitation(invitation.id, {
                completedAt: new Date().toISOString(),
                nextSendAt: null
              });
              console.log(`[EmailInvitation] Marked invitation complete for verified user ${user.email}`);
              stats.completed++;
            } else if (!user.isVerified && invitation.completedAt) {
              // Invitation marked complete but user not verified - reset it
              const nextSendAt = this.calculateNextSendTime(invitation.emailsSentCount);
              await storage.updateEmailInvitation(invitation.id, {
                completedAt: null,
                nextSendAt: nextSendAt ? nextSendAt.toISOString() : null
              });
              console.log(`[EmailInvitation] Reset broken completed invitation for unverified user ${user.email}`);
              stats.reset++;
              stats.enrolled++;
            } else {
              stats.skipped++;
            }
          }
        } catch (error) {
          console.error(`[EmailInvitation] Error processing ${user.email}:`, error);
          stats.errors++;
        }
      }
      
      console.log(`[EmailInvitation] Reconciliation complete:`, stats);
      return stats;
    } catch (error) {
      console.error('[EmailInvitation] Error during reconciliation:', error);
      throw error;
    }
  }

  // Backfill completed invitation records for verified users who don't have them
  // DEPRECATED: Use reconcileUserInvitations() instead
  public async backfillCompletedInvitations(): Promise<{ created: number; skipped: number; errors: number }> {
    console.log('[EmailInvitation] Starting backfill of completed invitation records...');
    console.log('[EmailInvitation] NOTE: This method is deprecated. Use reconcileUserInvitations() instead.');
    
    const stats = { created: 0, skipped: 0, errors: 0 };
    
    try {
      // Get all verified users
      const allUsers = await storage.getAllUsers();
      const verifiedUsers = allUsers.filter(user => user.isVerified);
      console.log(`[EmailInvitation] Found ${verifiedUsers.length} verified users to check`);
      
      for (const user of verifiedUsers) {
        try {
          // Find the person record for this user
          const person = await storage.getPersonByEmail(user.email);
          if (!person) {
            console.log(`[EmailInvitation] No person record found for ${user.email}, skipping`);
            stats.skipped++;
            continue;
          }
          
          // Check if this person already has an invitation record
          const existingInvitation = await storage.getEmailInvitationByPersonId(person.id);
          if (existingInvitation) {
            stats.skipped++;
            continue;
          }
          
          // Create a completed invitation record (no email sent)
          await storage.createEmailInvitation({
            personId: person.id,
            emailsSentCount: 0, // No emails were sent
            lastSentAt: null,
            nextSendAt: null,
            optedOut: false,
            finalMessageSent: false,
            completedAt: new Date().toISOString() // Mark as completed immediately
          });
          
          console.log(`[EmailInvitation] Created completed invitation record for ${user.email}`);
          stats.created++;
        } catch (error) {
          console.error(`[EmailInvitation] Error processing ${user.email}:`, error);
          stats.errors++;
        }
      }
      
      console.log(`[EmailInvitation] Backfill complete:`, stats);
      return stats;
    } catch (error) {
      console.error('[EmailInvitation] Error during backfill:', error);
      throw error;
    }
  }

  // Enroll specific people by IDs (for manual enrollment and new signups)
  public async enrollSpecificPeople(personIds: number[]): Promise<void> {
    console.log(`[EmailInvitation] Enrolling ${personIds.length} specific people`);
    
    try {
      // Get the next upcoming public event to include in emails
      let nextEvent = null;
      try {
        const futureEvents = await storage.getFutureEvents();
        if (futureEvents.length > 0) {
          nextEvent = futureEvents[0];
          console.log(`[EmailInvitation] Found next event: ${nextEvent.title}`);
        }
      } catch (error) {
        console.error('[EmailInvitation] Error fetching next event:', error);
      }

      const eventInfo = nextEvent ? {
        title: nextEvent.title,
        url: nextEvent.url || '',
        startTime: nextEvent.startTime
      } : undefined;

      for (const personId of personIds) {
        // Get person details
        const person = await storage.getPerson(personId);
        if (!person) {
          console.error(`[EmailInvitation] Person not found: ${personId}`);
          continue;
        }

        // Check if already enrolled
        const existingInvitation = await storage.getEmailInvitationByPersonId(personId);
        if (existingInvitation) {
          console.log(`[EmailInvitation] ${person.email} already has an invitation, skipping`);
          continue;
        }

        // Check if already has user account
        const user = await storage.getUserByEmail(person.email);
        if (user && user.isVerified) {
          // User already verified - create completed invitation record instead of sending email
          console.log(`[EmailInvitation] ${person.email} already has verified account, creating completed invitation record`);
          await storage.createEmailInvitation({
            personId: person.id,
            emailsSentCount: 0,
            lastSentAt: null,
            nextSendAt: null,
            optedOut: false,
            finalMessageSent: false,
            completedAt: new Date().toISOString()
          });
          continue;
        }

        console.log(`[EmailInvitation] Enrolling ${person.email}`);

        // Create verification token
        const verificationToken = await storage.createVerificationToken(person.email);

        // Send initial email
        let emailSent = false;
        if (this.dryRun) {
          console.log(`[EmailInvitation] DRY RUN: Would send email to ${person.email}`);
          emailSent = true;
        } else {
          emailSent = await sendVerificationEmail(
            person.email,
            verificationToken.token,
            true, // adminCreated
            0, // emailStage
            eventInfo
          );
        }

        if (emailSent) {
          const nextSendAt = this.calculateNextSendTime(1);
          await storage.createEmailInvitation({
            personId: person.id,
            emailsSentCount: 1,
            lastSentAt: new Date().toISOString(),
            nextSendAt: nextSendAt ? nextSendAt.toISOString() : null,
            optedOut: false,
            finalMessageSent: false
          });
          console.log(`[EmailInvitation] Successfully enrolled ${person.email}`);
        } else {
          console.error(`[EmailInvitation] Failed to send email to ${person.email}`);
        }
      }
    } catch (error) {
      console.error('[EmailInvitation] Error enrolling specific people:', error);
    }
  }

  // Main processing function (AUTOMATED - runs hourly)
  public async processInvitations(): Promise<void> {
    if (this.isProcessing) {
      console.log('[EmailInvitation] Already processing, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('[EmailInvitation] Starting invitation processing...');
    
    try {
      // 1. Detect claimed accounts (runs 24/7 every hour)
      await this.detectClaimedAccounts();
      
      // 2. Send follow-up emails (only during 9-10 AM Eastern window)
      await this.sendFollowUpEmails();
      
      // 3. Process new people for auto-enrollment (only those created after cutoff date)
      await this.processNewPeople();
      
      console.log('[EmailInvitation] Completed invitation processing');
    } catch (error) {
      console.error('[EmailInvitation] Error during processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Start the service
  public start(): void {
    if (this.serviceInterval) {
      console.log('[EmailInvitation] Service already started');
      return;
    }

    console.log('[EmailInvitation] Starting email invitation service...');
    
    // Run immediately on start
    this.processInvitations().catch(error => {
      console.error('[EmailInvitation] Error in initial processing:', error);
    });

    // Set up hourly interval
    this.serviceInterval = setInterval(() => {
      this.processInvitations().catch(error => {
        console.error('[EmailInvitation] Error in scheduled processing:', error);
      });
    }, this.SYNC_INTERVAL);

    // Keep the interval active
    if (this.serviceInterval.ref) {
      this.serviceInterval.ref();
    }

    console.log('[EmailInvitation] Service started with hourly checks');
  }

  // Stop the service
  public stop(): void {
    if (this.serviceInterval) {
      clearInterval(this.serviceInterval);
      this.serviceInterval = null;
      console.log('[EmailInvitation] Service stopped');
    }
  }
}

export const emailInvitationService = EmailInvitationService.getInstance();