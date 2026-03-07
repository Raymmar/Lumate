import { lumaApiRequest } from '../routes';
import { db } from '../db';
import { users, people, userPeopleLinks } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export class LumaMembershipService {
  private static getTierId(): string | null {
    return process.env.LUMA_MEMBERSHIP_TIER_ID || null;
  }

  static async addMemberToLumaTier(email: string): Promise<boolean> {
    const tierId = this.getTierId();
    if (!tierId) {
      console.log('[LumaMembership] No LUMA_MEMBERSHIP_TIER_ID configured, skipping Luma sync');
      return false;
    }

    try {
      console.log(`[LumaMembership] Adding ${email} to Luma membership tier ${tierId}`);
      
      await lumaApiRequest('memberships/members/add', undefined, {
        method: 'POST',
        body: JSON.stringify({
          email: email,
          membership_tier_id: tierId,
          skip_payment: true,
        }),
      });

      console.log(`[LumaMembership] Successfully added ${email} to Luma tier`);
      return true;
    } catch (error) {
      console.error(`[LumaMembership] Failed to add ${email} to Luma tier:`, error);
      return false;
    }
  }

  static async removeMemberFromLumaTier(email: string): Promise<boolean> {
    const tierId = this.getTierId();
    if (!tierId) {
      console.log('[LumaMembership] No LUMA_MEMBERSHIP_TIER_ID configured, skipping Luma sync');
      return false;
    }

    try {
      console.log(`[LumaMembership] Removing ${email} from Luma membership tier`);

      await lumaApiRequest('memberships/members/update-status', undefined, {
        method: 'POST',
        body: JSON.stringify({
          user_id: email,
          status: 'declined',
        }),
      });

      console.log(`[LumaMembership] Successfully removed ${email} from Luma tier`);
      return true;
    } catch (error) {
      console.error(`[LumaMembership] Failed to remove ${email} from Luma tier:`, error);
      return false;
    }
  }

  static async syncMembershipFromLuma(personData: {
    email: string;
    membership?: {
      status: string;
      calendar_membership_tier_id: string | null;
    } | null;
  }): Promise<void> {
    if (!personData.membership) return;

    const { status, calendar_membership_tier_id } = personData.membership;
    const configuredTierId = this.getTierId();

    try {
      await db
        .update(people)
        .set({
          lumaMembershipStatus: status,
          lumaMembershipTierId: calendar_membership_tier_id,
        })
        .where(eq(people.email, personData.email));

      if (configuredTierId && calendar_membership_tier_id === configuredTierId) {
        if (status === 'approved') {
          const matchingUsers = await db
            .select()
            .from(users)
            .where(eq(users.email, personData.email.toLowerCase()));

          for (const user of matchingUsers) {
            if (user.subscriptionStatus === 'active') continue;
            if (user.premiumSource === 'manual' && user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date()) continue;

            if (!user.premiumSource || (user.premiumExpiresAt && new Date(user.premiumExpiresAt) <= new Date())) {
              const expiresAt = new Date();
              expiresAt.setFullYear(expiresAt.getFullYear() + 1);

              await db
                .update(users)
                .set({
                  premiumSource: 'luma',
                  premiumExpiresAt: expiresAt.toISOString(),
                  premiumGrantedAt: new Date().toISOString(),
                })
                .where(eq(users.id, user.id));

              console.log(`[LumaMembership] Granted premium to ${user.email} from Luma membership (expires ${expiresAt.toISOString()})`);
            }
          }
        } else if (status === 'declined' || status === 'revoked') {
          const matchingUsers = await db
            .select()
            .from(users)
            .where(eq(users.email, personData.email.toLowerCase()));

          for (const user of matchingUsers) {
            if (user.premiumSource === 'luma') {
              await db
                .update(users)
                .set({
                  premiumSource: null,
                  premiumExpiresAt: null,
                  premiumGrantedAt: null,
                })
                .where(eq(users.id, user.id));

              console.log(`[LumaMembership] Revoked Luma-granted premium for ${user.email} (status: ${status})`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`[LumaMembership] Error syncing membership for ${personData.email}:`, error);
    }
  }

  static async linkPersonToUser(userId: number, personId: number, isPrimary: boolean = false): Promise<void> {
    try {
      await db.insert(userPeopleLinks).values({
        userId,
        personId,
        isPrimary,
      }).onConflictDoNothing();

      if (isPrimary) {
        await db
          .update(userPeopleLinks)
          .set({ isPrimary: false })
          .where(and(
            eq(userPeopleLinks.userId, userId),
            sql`${userPeopleLinks.personId} != ${personId}`
          ));

        await db
          .update(users)
          .set({ personId })
          .where(eq(users.id, userId));
      }
    } catch (error) {
      console.error(`[LumaMembership] Error linking person ${personId} to user ${userId}:`, error);
    }
  }

  static async autoLinkByEmail(userId: number, email: string): Promise<boolean> {
    try {
      const matchingPeople = await db
        .select()
        .from(people)
        .where(eq(people.email, email.toLowerCase()));

      if (matchingPeople.length === 0) return false;

      const existingLinks = await db
        .select()
        .from(userPeopleLinks)
        .where(eq(userPeopleLinks.userId, userId));

      const hasPrimary = existingLinks.some(l => l.isPrimary);

      for (const person of matchingPeople) {
        const alreadyLinked = existingLinks.some(l => l.personId === person.id);
        if (alreadyLinked) continue;

        const shouldBePrimary = !hasPrimary && existingLinks.length === 0;
        await this.linkPersonToUser(userId, person.id, shouldBePrimary);

        if (shouldBePrimary) {
          await db
            .update(users)
            .set({ personId: person.id })
            .where(eq(users.id, userId));
        }

        console.log(`[LumaMembership] Auto-linked person ${person.id} (${person.email}) to user ${userId}${shouldBePrimary ? ' (primary)' : ''}`);
      }

      return matchingPeople.length > 0;
    } catch (error) {
      console.error(`[LumaMembership] Error auto-linking by email for user ${userId}:`, error);
      return false;
    }
  }

  static async getLinkedPeople(userId: number) {
    try {
      const links = await db
        .select({
          link: userPeopleLinks,
          person: people,
        })
        .from(userPeopleLinks)
        .innerJoin(people, eq(userPeopleLinks.personId, people.id))
        .where(eq(userPeopleLinks.userId, userId));

      return links.map(l => ({
        ...l.person,
        isPrimary: l.link.isPrimary,
        linkedAt: l.link.linkedAt,
      }));
    } catch (error) {
      console.error(`[LumaMembership] Error getting linked people for user ${userId}:`, error);
      return [];
    }
  }

  static async unlinkPerson(userId: number, personId: number): Promise<boolean> {
    try {
      const link = await db
        .select()
        .from(userPeopleLinks)
        .where(and(
          eq(userPeopleLinks.userId, userId),
          eq(userPeopleLinks.personId, personId)
        ))
        .limit(1);

      if (link.length === 0) return false;

      if (link[0].isPrimary) {
        await db
          .update(users)
          .set({ personId: null })
          .where(eq(users.id, userId));
      }

      await db
        .delete(userPeopleLinks)
        .where(and(
          eq(userPeopleLinks.userId, userId),
          eq(userPeopleLinks.personId, personId)
        ));

      if (link[0].isPrimary) {
        const remaining = await db
          .select()
          .from(userPeopleLinks)
          .where(eq(userPeopleLinks.userId, userId))
          .limit(1);

        if (remaining.length > 0) {
          await db
            .update(userPeopleLinks)
            .set({ isPrimary: true })
            .where(eq(userPeopleLinks.id, remaining[0].id));

          await db
            .update(users)
            .set({ personId: remaining[0].personId })
            .where(eq(users.id, userId));
        }
      }

      console.log(`[LumaMembership] Unlinked person ${personId} from user ${userId}`);
      return true;
    } catch (error) {
      console.error(`[LumaMembership] Error unlinking person ${personId} from user ${userId}:`, error);
      return false;
    }
  }

  static async setPrimaryPerson(userId: number, personId: number): Promise<boolean> {
    try {
      const link = await db
        .select()
        .from(userPeopleLinks)
        .where(and(
          eq(userPeopleLinks.userId, userId),
          eq(userPeopleLinks.personId, personId)
        ))
        .limit(1);

      if (link.length === 0) return false;

      await db
        .update(userPeopleLinks)
        .set({ isPrimary: false })
        .where(eq(userPeopleLinks.userId, userId));

      await db
        .update(userPeopleLinks)
        .set({ isPrimary: true })
        .where(and(
          eq(userPeopleLinks.userId, userId),
          eq(userPeopleLinks.personId, personId)
        ));

      await db
        .update(users)
        .set({ personId })
        .where(eq(users.id, userId));

      console.log(`[LumaMembership] Set person ${personId} as primary for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`[LumaMembership] Error setting primary person for user ${userId}:`, error);
      return false;
    }
  }
}
