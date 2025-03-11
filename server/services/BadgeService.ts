import { db } from "../db";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { users, attendance, badges, userBadges } from "@shared/schema";

export class BadgeService {
  private static instance: BadgeService;

  private constructor() {}

  public static getInstance(): BadgeService {
    if (!BadgeService.instance) {
      BadgeService.instance = new BadgeService();
    }
    return BadgeService.instance;
  }

  private async getBadgeByName(name: string) {
    const [badge] = await db
      .select()
      .from(badges)
      .where(eq(badges.name, name));
    return badge;
  }

  private async getUserAttendance(userEmail: string) {
    return db
      .select()
      .from(attendance)
      .where(sql`LOWER(user_email) = LOWER(${userEmail})`);
  }

  private async getExistingBadges(userId: number) {
    return db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
  }

  private hasBadge(existingBadges: any[], badgeId: number): boolean {
    return existingBadges.some(b => b.badgeId === badgeId);
  }

  private async assignBadge(userId: number, badgeId: number) {
    return db
      .insert(userBadges)
      .values({
        userId,
        badgeId,
        assignedAt: new Date().toISOString(),
      })
      .returning();
  }

  public async processUserBadges(user: any) {
    console.log(`Processing badges for user ${user.email}`);
    
    const userAttendance = await this.getUserAttendance(user.email);
    console.log(`Found ${userAttendance.length} attendance records`);

    const existingBadges = await this.getExistingBadges(user.id);

    // Summit Attendee Badge
    const hasSummitAttendance = userAttendance.some(record => 
      record.eventApiId === 'evt-7mHZuVCKYfqARWL'
    );
    
    // OG Badge
    const ogEvents = [
      'evt-KUEx5csMUv6otHD',
      'evt-LArNIZtsDO3shT7',
      'evt-t8pRapBHvNlNw1L',
      'evt-C1AWCRN0nScneOw'
    ];
    const hasOgAttendance = userAttendance.some(record => 
      ogEvents.includes(record.eventApiId)
    );

    // Newbie Badge
    const isNewbie = userAttendance.length < 3;

    // Get badge definitions
    const [summitBadge, ogBadge, newbieBadge] = await Promise.all([
      this.getBadgeByName('2025 Summit'),
      this.getBadgeByName('OG'),
      this.getBadgeByName('Newbie')
    ]);

    // Process badge assignments
    const assignments = [];

    if (hasSummitAttendance && summitBadge && !this.hasBadge(existingBadges, summitBadge.id)) {
      assignments.push(this.assignBadge(user.id, summitBadge.id));
      console.log(`Assigning Summit Attendee badge to ${user.email}`);
    }

    if (hasOgAttendance && ogBadge && !this.hasBadge(existingBadges, ogBadge.id)) {
      assignments.push(this.assignBadge(user.id, ogBadge.id));
      console.log(`Assigning OG badge to ${user.email}`);
    }

    if (isNewbie && newbieBadge && !this.hasBadge(existingBadges, newbieBadge.id)) {
      assignments.push(this.assignBadge(user.id, newbieBadge.id));
      console.log(`Assigning Newbie badge to ${user.email}`);
    }

    if (assignments.length > 0) {
      await Promise.all(assignments);
      console.log(`Completed ${assignments.length} badge assignments for ${user.email}`);
    } else {
      console.log(`No new badges to assign for ${user.email}`);
    }
  }

  public async runDailyBadgeAssignment() {
    console.log('Starting daily badge assignment process');
    
    try {
      const allUsers = await db.select().from(users);
      console.log(`Processing ${allUsers.length} users for badge assignment`);

      for (const user of allUsers) {
        try {
          await this.processUserBadges(user);
        } catch (error) {
          console.error(`Failed to process badges for user ${user.email}:`, error);
          // Continue processing other users even if one fails
        }
      }

      console.log('Completed daily badge assignment process');
      return true;
    } catch (error) {
      console.error('Failed to run daily badge assignment:', error);
      throw error;
    }
  }
}

export const badgeService = BadgeService.getInstance();
