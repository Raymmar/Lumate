import { sql, type SQL } from "drizzle-orm";

// Keep primary and linked identities in one query so all suppression paths agree.
export function blockedEmailAddresses(): SQL {
  return sql`
    SELECT LOWER(blocked_user.email) AS email
    FROM users blocked_user
    WHERE blocked_user.blocked_at IS NOT NULL
    UNION
    SELECT LOWER(linked_person.email) AS email
    FROM users blocked_user
    INNER JOIN user_people_links blocked_link ON blocked_link.user_id = blocked_user.id
    INNER JOIN people linked_person ON linked_person.id = blocked_link.person_id
    WHERE blocked_user.blocked_at IS NOT NULL
  `;
}

export function isBlockedEmail(email: string | SQL): SQL {
  return sql`EXISTS (
    SELECT 1 FROM (${blockedEmailAddresses()}) blocked_email
    WHERE blocked_email.email = LOWER(${email})
  )`;
}