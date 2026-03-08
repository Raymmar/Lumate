import { lumaApiRequest } from '../routes';
import { db } from '../db';
import { users, people, userPeopleLinks } from '@shared/schema';
import { eq, and, sql, or, gt, isNotNull } from 'drizzle-orm';

export class LumaMembershipService {
  private static cachedTierId: string | null = null;
  private static tierResolved = false;

  private static getTierId(): string | null {
    if (process.env.LUMA_MEMBERSHIP_TIER_ID) {
      return process.env.LUMA_MEMBERSHIP_TIER_ID;
    }
    return this.cachedTierId;
  }

  static async fetchMembershipTiers(): Promise<any[]> {
    const allTiers: any[] = [];
    let hasMore = true;
    let nextCursor: string | null = null;

    while (hasMore) {
      const params: Record<string, string> = {};
      if (nextCursor) {
        params.pagination_cursor = nextCursor;
      }

      try {
        const response = await lumaApiRequest('memberships/tiers/list', Object.keys(params).length > 0 ? params : undefined);

        if (!response || !Array.isArray(response.entries)) {
          console.log('[LumaMembership] Invalid response from membership tiers API:', response);
          break;
        }

        allTiers.push(...response.entries);
        hasMore = response.has_more === true;
        nextCursor = response.next_cursor || null;
      } catch (error) {
        console.error('[LumaMembership] Failed to fetch membership tiers:', error);
        break;
      }
    }

    console.log(`[LumaMembership] Fetched ${allTiers.length} membership tiers from Luma`);
    for (const tier of allTiers) {
      console.log(`[LumaMembership]   Tier: "${tier.name}" (${tier.id}) - ${tier.access_info?.type || 'unknown'}`);
    }

    return allTiers;
  }

  static async resolveTierId(): Promise<string | null> {
    if (process.env.LUMA_MEMBERSHIP_TIER_ID) {
      console.log(`[LumaMembership] Using LUMA_MEMBERSHIP_TIER_ID from env: ${process.env.LUMA_MEMBERSHIP_TIER_ID}`);
      this.cachedTierId = process.env.LUMA_MEMBERSHIP_TIER_ID;
      this.tierResolved = true;
      return this.cachedTierId;
    }

    if (this.tierResolved && this.cachedTierId) {
      return this.cachedTierId;
    }

    console.log('[LumaMembership] No LUMA_MEMBERSHIP_TIER_ID env var set, fetching tiers from Luma API...');
    const tiers = await this.fetchMembershipTiers();

    if (tiers.length === 0) {
      console.log('[LumaMembership] No membership tiers found on Luma calendar (will retry on next call)');
      return null;
    }

    this.cachedTierId = tiers[0].id;
    this.tierResolved = true;
    console.log(`[LumaMembership] Resolved membership tier: "${tiers[0].name}" (${this.cachedTierId})`);
    return this.cachedTierId;
  }

  static async syncPremiumMembersToLuma(): Promise<void> {
    const tierId = await this.resolveTierId();
    if (!tierId) {
      console.log('[LumaMembership] No tier ID available, skipping push sync to Luma');
      return;
    }

    console.log('[LumaMembership] Starting push sync: sending premium members to Luma...');

    try {
      const now = new Date().toISOString();
      const premiumUsers = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.subscriptionStatus, 'active'),
            and(
              isNotNull(users.premiumSource),
              or(
                gt(users.premiumExpiresAt, now),
                sql`${users.premiumExpiresAt} IS NULL`
              )
            )
          )
        );

      console.log(`[LumaMembership] Found ${premiumUsers.length} premium users to sync to Luma`);

      let successCount = 0;
      let skipCount = 0;
      let failCount = 0;

      for (const user of premiumUsers) {
        try {
          const result = await this.addMemberToLumaTier(user.email);
          if (result) {
            successCount++;
          } else {
            skipCount++;
          }
        } catch (error) {
          failCount++;
          console.error(`[LumaMembership] Failed to push ${user.email} to Luma:`, error);
        }
      }

      console.log(`[LumaMembership] Push sync complete: ${successCount} added, ${skipCount} skipped, ${failCount} failed`);
    } catch (error) {
      console.error('[LumaMembership] Error during push sync to Luma:', error);
    }
  }

  static async addMemberToLumaTier(email: string): Promise<boolean> {
    let tierId = this.getTierId();
    if (!tierId) {
      tierId = await this.resolveTierId();
    }
    if (!tierId) {
      console.log('[LumaMembership] No membership tier ID available, skipping Luma sync');
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
    let tierId = this.getTierId();
    if (!tierId) {
      tierId = await this.resolveTierId();
    }
    if (!tierId) {
      console.log('[LumaMembership] No membership tier ID available, skipping Luma sync');
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
    let configuredTierId = this.getTierId();
    if (!configuredTierId) {
      configuredTierId = await this.resolveTierId();
    }

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
