import { lumaApiRequest } from '../routes';
import { db } from '../db';
import { users, people, userPeopleLinks } from '@shared/schema';
import { eq, and, sql, or, gt, isNotNull, isNull } from 'drizzle-orm';

export interface LumaMember {
  email: string;
  status: string;
  tierId: string | null;
  revenueUsdCents: number;
}

export interface ReconciliationResult {
  pushedToLuma: number;
  pulledFromLuma: number;
  removedFromLuma: number;
  stripeStatusUpdated: number;
  errors: number;
  details: string[];
}

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

  static async fetchLumaMembersList(): Promise<LumaMember[]> {
    const tierId = await this.resolveTierId();
    if (!tierId) {
      console.log('[LumaMembership] No tier ID available, cannot fetch Luma members list');
      return [];
    }

    try {
      const rows = await db
        .select({
          email: people.email,
          lumaMembershipStatus: people.lumaMembershipStatus,
          lumaMembershipTierId: people.lumaMembershipTierId,
          revenueUsdCents: people.revenueUsdCents,
        })
        .from(people)
        .where(
          and(
            eq(people.lumaMembershipTierId, tierId),
            isNotNull(people.lumaMembershipStatus)
          )
        );

      const allMembers: LumaMember[] = rows.map(row => ({
        email: row.email.toLowerCase(),
        status: row.lumaMembershipStatus || 'unknown',
        tierId: row.lumaMembershipTierId,
        revenueUsdCents: row.revenueUsdCents || 0,
      }));

      console.log(`[LumaMembership] Found ${allMembers.length} Luma members from synced people table (tier: ${tierId})`);
      return allMembers;
    } catch (error) {
      console.error('[LumaMembership] Error querying people table for Luma members:', error);
      return [];
    }
  }

  static async getActivePremiumEmails(): Promise<Map<string, { source: string; fromEventTicket?: boolean }>> {
    const premiumEmails = new Map<string, { source: string; fromEventTicket?: boolean }>();

    // Blocked users are never premium and must never be pushed to Luma
    const blockedRows = await db
      .select({ email: users.email })
      .from(users)
      .where(isNotNull(users.blockedAt));
    const blockedEmails = new Set(blockedRows.map(b => b.email.toLowerCase()));

    const now = new Date().toISOString();
    const usersWithGrants = await db
      .select({ email: users.email, premiumSource: users.premiumSource, lumaTicketId: users.lumaTicketId })
      .from(users)
      .where(
        and(
          isNotNull(users.premiumSource),
          isNull(users.blockedAt),
          or(
            gt(users.premiumExpiresAt, now),
            sql`${users.premiumExpiresAt} IS NULL`
          )
        )
      );

    for (const u of usersWithGrants) {
      premiumEmails.set(u.email.toLowerCase(), {
        source: u.premiumSource || 'unknown',
        fromEventTicket: !!(u.premiumSource === 'luma' && u.lumaTicketId),
      });
    }

    try {
      const stripeActiveResult = await db.execute(
        sql`
          SELECT LOWER(c.email) as email
          FROM stripe.subscriptions s
          INNER JOIN stripe.customers c ON c.id = s.customer
          WHERE s.status = 'active'
          AND c.email IS NOT NULL
        `
      );
      const rows = stripeActiveResult.rows as Array<{ email: string }>;
      for (const row of rows) {
        if (row.email && !blockedEmails.has(row.email) && !premiumEmails.has(row.email)) {
          premiumEmails.set(row.email, { source: 'stripe' });
        }
      }
    } catch (error) {
      console.error('[LumaMembership] Error querying stripe.subscriptions for active emails:', error);
      const fallbackUsers = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.subscriptionStatus, 'active'));
      for (const u of fallbackUsers) {
        const lowerEmail = u.email.toLowerCase();
        if (!blockedEmails.has(lowerEmail) && !premiumEmails.has(lowerEmail)) {
          premiumEmails.set(lowerEmail, { source: 'stripe' });
        }
      }
    }

    return premiumEmails;
  }

  static async reconcileMemberships(): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      pushedToLuma: 0,
      pulledFromLuma: 0,
      removedFromLuma: 0,
      stripeStatusUpdated: 0,
      errors: 0,
      details: [],
    };

    const tierId = await this.resolveTierId();
    if (!tierId) {
      result.details.push('No tier ID available, skipping reconciliation');
      console.log('[LumaMembership] No tier ID available, skipping reconciliation');
      return result;
    }

    console.log('[LumaMembership] Starting full membership reconciliation...');

    try {
      await this.reconcileStripeStatuses(result);
    } catch (error) {
      console.error('[LumaMembership] Error during Stripe status reconciliation:', error);
      result.details.push('Stripe status reconciliation failed');
    }

    const lumaMembers = await this.fetchLumaMembersList();
    const lumaApprovedEmails = new Set<string>();
    const lumaRevokedEmails = new Set<string>();
    const lumaMemberRevenue = new Map<string, number>();
    for (const member of lumaMembers) {
      if (member.status === 'approved') {
        lumaApprovedEmails.add(member.email);
        lumaMemberRevenue.set(member.email, member.revenueUsdCents);
      } else if (member.status === 'declined' || member.status === 'revoked') {
        lumaRevokedEmails.add(member.email);
      }
    }
    console.log(`[LumaMembership] Luma tier: ${lumaApprovedEmails.size} approved, ${lumaRevokedEmails.size} declined/revoked`);

    for (const email of lumaRevokedEmails) {
      const matchingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (matchingUsers.length === 0) continue;

      const user = matchingUsers[0];
      if (user.premiumSource === 'luma' && !user.lumaTicketId) {
        await db
          .update(users)
          .set({
            premiumSource: null,
            premiumExpiresAt: null,
            premiumGrantedAt: null,
          })
          .where(eq(users.id, user.id));

        result.pulledFromLuma++;
        result.details.push(`Revoked local Luma premium (Luma declined/revoked): ${email}`);
        console.log(`[LumaMembership] Revoked Luma-granted premium for ${email} (Luma status: declined/revoked)`);
      }
    }

    for (const email of lumaApprovedEmails) {
      const totalRevenue = lumaMemberRevenue.get(email) || 0;
      if (totalRevenue <= 0) continue;

      const matchingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (matchingUsers.length === 0) continue;

      const user = matchingUsers[0];

      // Never grant premium to a blocked user
      if (user.blockedAt) {
        console.log(`[LumaMembership] Skipping Luma premium grant for blocked user: ${email}`);
        continue;
      }

      const hasActiveStripe = user.subscriptionStatus === 'active';
      const hasActiveManual = user.premiumSource === 'manual' && user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date();
      const hasActiveLuma = user.premiumSource === 'luma' && user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date();

      if (hasActiveStripe || hasActiveManual || hasActiveLuma) continue;

      const premiumTicketResult = await db.execute(
        sql`SELECT a.ticket_type_id, a.ticket_type_name, a.ticket_amount, e.premium_ticket_types
            FROM attendance a
            JOIN events e ON e.api_id = a.event_api_id
            WHERE LOWER(a.user_email) = ${email}
            AND e.grants_premium_access = true
            AND a.ticket_type_id IS NOT NULL`
      );

      let accessExplainedByTicket = false;
      for (const row of premiumTicketResult.rows as any[]) {
        const premiumTypes: string[] = (() => {
          try {
            if (Array.isArray(row.premium_ticket_types)) return row.premium_ticket_types;
            if (typeof row.premium_ticket_types === 'string') return JSON.parse(row.premium_ticket_types);
          } catch {}
          return [];
        })();

        if (premiumTypes.includes(row.ticket_type_id)) {
          accessExplainedByTicket = true;
          break;
        }
      }

      if (accessExplainedByTicket) {
        console.log(`[LumaMembership] ${email} has Luma revenue ($${(totalRevenue / 100).toFixed(2)}) but access is from a premium event ticket — skipping`);
        continue;
      }

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

      result.pulledFromLuma++;
      result.details.push(`Granted premium from Luma membership payment: ${email} (revenue: $${(totalRevenue / 100).toFixed(2)})`);
      console.log(`[LumaMembership] Granted premium to ${email} — paid on Luma (revenue: $${(totalRevenue / 100).toFixed(2)}, no premium ticket found)`);
    }

    const activePremiumEmails = await this.getActivePremiumEmails();

    const ticketPremiumResult = await db.execute(
      sql`SELECT DISTINCT LOWER(a.user_email) as email
          FROM attendance a
          INNER JOIN events e ON e.api_id = a.event_api_id
          WHERE e.grants_premium_access = true
            AND a.approval_status = 'approved'
            AND a.ticket_type_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM json_array_elements_text(e.premium_ticket_types) AS pt
              WHERE pt.value = a.ticket_type_id
            )
            AND (e.premium_expires_at IS NULL OR e.premium_expires_at > NOW())`
    );
    for (const row of ticketPremiumResult.rows as any[]) {
      if (row.email && !activePremiumEmails.has(row.email)) {
        activePremiumEmails.set(row.email, { source: 'luma', fromEventTicket: true });
      }
    }

    console.log(`[LumaMembership] Found ${activePremiumEmails.size} active premium emails from all sources (after Luma sync)`);

    const emailsToPush: Array<{ email: string; info: { source: string; fromEventTicket?: boolean } }> = [];
    for (const [email, info] of activePremiumEmails) {
      if (lumaApprovedEmails.has(email)) continue;
      if (info.source === 'luma' && !info.fromEventTicket) continue;
      emailsToPush.push({ email, info });
    }

    console.log(`[LumaMembership] ${emailsToPush.length} members need to be pushed to Luma (${activePremiumEmails.size} total - ${lumaApprovedEmails.size} already on Luma)`);

    for (const { email, info } of emailsToPush) {
      try {
        const pushed = await this.addMemberToLumaTier(email);
        if (pushed) {
          result.pushedToLuma++;
          result.details.push(`Pushed to Luma (source: ${info.source}): ${email}`);
        }
        await new Promise(resolve => setTimeout(resolve, 750));
      } catch (error) {
        result.errors++;
        console.error(`[LumaMembership] Failed to push ${email} to Luma:`, error);
      }
    }

    for (const email of lumaApprovedEmails) {
      if (activePremiumEmails.has(email)) continue;

      const memberRevenue = lumaMemberRevenue.get(email) || 0;
      if (memberRevenue > 0) {
        console.log(`[LumaMembership] ${email} not in active premium but has Luma revenue ($${(memberRevenue / 100).toFixed(2)}) — leaving on Luma tier (may have paid directly)`);
        continue;
      }

      const matchingUsers = await db
        .select({ id: users.id, premiumSource: users.premiumSource })
        .from(users)
        .where(eq(users.email, email));

      if (matchingUsers.length === 0) {
        continue;
      }

      const user = matchingUsers[0];
      if (!user.premiumSource) {
        try {
          const removed = await this.removeMemberFromLumaTier(email);
          if (removed) {
            result.removedFromLuma++;
            result.details.push(`Removed from Luma (no active premium, no Luma revenue): ${email}`);
          }
          await new Promise(resolve => setTimeout(resolve, 750));
        } catch (error) {
          result.errors++;
          console.error(`[LumaMembership] Failed to remove ${email} from Luma:`, error);
        }
      }
    }

    console.log(`[LumaMembership] Reconciliation complete: ${result.pushedToLuma} pushed, ${result.pulledFromLuma} pulled, ${result.removedFromLuma} removed, ${result.stripeStatusUpdated} stripe statuses corrected, ${result.errors} errors`);
    return result;
  }

  private static async reconcileStripeStatuses(result: ReconciliationResult): Promise<void> {
    try {
      interface StaleUserRow { id: number; email: string; subscription_status: string; subscription_id: string | null }
      const staleUsers = await db.execute(
        sql`
          SELECT u.id, u.email, u.subscription_status, u.subscription_id
          FROM users u
          WHERE u.subscription_status = 'active'
          AND NOT EXISTS (
            SELECT 1
            FROM stripe.subscriptions s
            INNER JOIN stripe.customers c ON c.id = s.customer
            WHERE LOWER(c.email) = LOWER(u.email)
            AND s.status = 'active'
          )
        `
      );

      for (const row of staleUsers.rows as StaleUserRow[]) {
        await db
          .update(users)
          .set({ subscriptionStatus: 'inactive' })
          .where(eq(users.id, row.id));

        result.stripeStatusUpdated++;
        result.details.push(`Stripe status corrected to inactive: ${row.email}`);
        console.log(`[LumaMembership] Corrected stale Stripe status for ${row.email} (no active subscription in Stripe connector data)`);
      }

      interface MissedActiveRow { id: number; email: string; sub_id: string }
      const missedActiveResult = await db.execute(
        sql`
          SELECT u.id, u.email, s.id as sub_id
          FROM users u
          INNER JOIN stripe.customers c ON LOWER(c.email) = LOWER(u.email)
          INNER JOIN stripe.subscriptions s ON s.customer = c.id AND s.status = 'active'
          WHERE (u.subscription_status IS NULL OR u.subscription_status != 'active')
        `
      );

      for (const row of missedActiveResult.rows as MissedActiveRow[]) {
        await db
          .update(users)
          .set({
            subscriptionStatus: 'active',
            subscriptionId: row.sub_id,
          })
          .where(eq(users.id, row.id));

        result.stripeStatusUpdated++;
        result.details.push(`Stripe status corrected to active: ${row.email}`);
        console.log(`[LumaMembership] Corrected missed Stripe status for ${row.email} (active subscription found in Stripe connector data)`);
      }
    } catch (error) {
      console.error('[LumaMembership] Error reconciling Stripe statuses:', error);
      result.details.push('Stripe status reconciliation query failed — stripe schema may not exist yet');
    }
  }

  static async syncPremiumMembersToLuma(): Promise<void> {
    const tierId = await this.resolveTierId();
    if (!tierId) {
      console.log('[LumaMembership] No tier ID available, skipping push sync to Luma');
      return;
    }

    console.log('[LumaMembership] Starting push sync: sending premium members to Luma...');

    try {
      const premiumEmails = await this.getActivePremiumEmails();

      console.log(`[LumaMembership] Found ${premiumEmails.size} premium users to sync to Luma`);

      let successCount = 0;
      let skipCount = 0;
      let failCount = 0;

      for (const [email] of premiumEmails) {
        try {
          const result = await this.addMemberToLumaTier(email);
          if (result) {
            successCount++;
          } else {
            skipCount++;
          }
        } catch (error) {
          failCount++;
          console.error(`[LumaMembership] Failed to push ${email} to Luma:`, error);
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
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('already has an active membership')) {
        console.log(`[LumaMembership] ${email} already has an active membership in Luma — skipping`);
        return true;
      }
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
