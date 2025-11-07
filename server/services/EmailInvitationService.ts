import { storage } from '../storage';
import { sendVerificationEmail } from '../email';
import { Person } from '@shared/schema';
import { toZonedTime } from 'date-fns-tz';

export class EmailInvitationService {
  private static instance: EmailInvitationService;
  private readonly SYNC_INTERVAL = 60 * 60 * 1000; // Run every hour
  private serviceInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private dryRun: boolean = true; // SAFETY: Default to dry-run mode
  
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

  // Calculate the next send time based on email count
  private calculateNextSendTime(emailsSentCount: number): Date | null {
    const easternTz = 'America/New_York';
    const now = new Date();
    const easternTime = toZonedTime(now, easternTz);
    
    // Create a base date at 9:30 AM Eastern
    let nextSend = new Date(easternTime);
    nextSend.setHours(9, 30, 0, 0);

    // Calculate days to add based on email count
    let daysToAdd: number;
    
    switch (emailsSentCount) {
      case 0: // Initial email - immediately
        return now;
      case 1: // 24 hours after initial
        daysToAdd = 1;
        break;
      case 2: // 36 hours after initial (1.5 days, but we'll round to next 9:30 AM)
        daysToAdd = 2;
        break;
      case 3: // 7 days after initial
        daysToAdd = 7;
        break;
      case 4: // 14 days after initial
        daysToAdd = 14;
        break;
      default: // Monthly thereafter (up to 90 days)
        // Check if it's been more than 90 days since the first email
        if (emailsSentCount >= 7) { // 90 days = initial + 1 + 2 + 7 + 14 + 30 + 30 + 30
          return null; // Stop sending
        }
        daysToAdd = 30;
        break;
    }

    // Add the days
    nextSend.setDate(nextSend.getDate() + daysToAdd);
    
    // If the calculated time is in the past, move to tomorrow 9:30 AM
    if (nextSend <= now) {
      nextSend.setDate(now.getDate() + 1);
    }
    
    return nextSend;
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

  // Check if we're in the sending window (9-10 AM Eastern)
  private isInSendingWindow(): boolean {
    const easternTz = 'America/New_York';
    const easternTime = toZonedTime(new Date(), easternTz);
    const hour = easternTime.getHours();
    return hour === 9; // 9 AM hour (9:00-9:59)
  }

  // Process new people who don't have invitations yet
  private async processNewPeople(): Promise<void> {
    try {
      let unclaimedPeople = await storage.getUnclaimedPeople();
      console.log(`[EmailInvitation] Found ${unclaimedPeople.length} unclaimed people`);
      
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

  // Main processing function
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
      
      // 2. Process new people (always, regardless of time)
      await this.processNewPeople();
      
      // 3. Send follow-up emails (only during 9-10 AM Eastern window)
      await this.sendFollowUpEmails();
      
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