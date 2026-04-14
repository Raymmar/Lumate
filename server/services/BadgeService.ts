import { db } from "../db";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { users, attendance, badges, userBadges, badgeRules } from "@shared/schema";

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
    const badgeNameMap: { [key: string]: string } = {
      'Summit Attendee': '2025 Summit',
      '2025 Summit': '2025 Summit',
    };

    const searchName = badgeNameMap[name] || name;

    const [badge] = await db
      .select()
      .from(badges)
      .where(sql`LOWER(name) = LOWER(${searchName})`);

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
    try {
      const [assignment] = await db
        .insert(userBadges)
        .values({
          userId,
          badgeId,
          assignedAt: new Date().toISOString(),
        })
        .returning();

      return assignment;
    } catch (error) {
      console.error('Failed to assign badge:', {
        userId,
        badgeId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private evaluateRules(
    rules: { ruleType: string; config: Record<string, any> }[],
    userAttendance: any[],
    user: any
  ): boolean {
    if (rules.length === 0) return false;

    const autoRules = rules.filter(r => r.ruleType !== 'manual_only');
    if (autoRules.length === 0) return false;

    for (const rule of autoRules) {
      const matched = this.evaluateSingleRule(rule, userAttendance, user);
      if (matched) return true;
    }
    return false;
  }

  private evaluateSingleRule(
    rule: { ruleType: string; config: Record<string, any> },
    userAttendance: any[],
    user: any
  ): boolean {
    switch (rule.ruleType) {
      case 'event_attendance': {
        const eventApiId = rule.config.eventApiId;
        if (!eventApiId) return false;
        return userAttendance.some(record => record.eventApiId === eventApiId);
      }
      case 'premium_member': {
        const hasPremium =
          user.subscriptionStatus === 'active' ||
          (user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date());
        return !!hasPremium;
      }
      case 'event_count_min': {
        const minEvents = rule.config.minEvents || 0;
        return userAttendance.length >= minEvents;
      }
      case 'event_count_max': {
        const maxEvents = rule.config.maxEvents || 0;
        return userAttendance.length < maxEvents;
      }
      case 'manual_only':
        return false;
      default:
        return false;
    }
  }

  public async processUserBadges(user: any) {
    const userAttendance = await this.getUserAttendance(user.email);
    const existingBadges = await this.getExistingBadges(user.id);

    const allBadges = await db.select().from(badges);
    const allRules = await db.select().from(badgeRules);

    const rulesByBadge = new Map<number, typeof allRules>();
    for (const rule of allRules) {
      const existing = rulesByBadge.get(rule.badgeId) || [];
      existing.push(rule);
      rulesByBadge.set(rule.badgeId, existing);
    }

    const assignments = [];

    for (const badge of allBadges) {
      if (this.hasBadge(existingBadges, badge.id)) continue;

      const rules = rulesByBadge.get(badge.id) || [];
      if (rules.length === 0) continue;

      const shouldAssign = this.evaluateRules(rules, userAttendance, user);
      if (shouldAssign) {
        assignments.push(this.assignBadge(user.id, badge.id));
        console.log(`Assigning ${badge.name} badge to ${user.email}`);
      }
    }

    if (assignments.length > 0) {
      await Promise.all(assignments);
      console.log(`Completed ${assignments.length} badge assignments for ${user.email}`);
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
