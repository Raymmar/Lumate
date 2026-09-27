---
name: User blocking system
description: Non-obvious decisions/constraints in the Block/Ban User feature
---

# Block/Ban User system

- **Keep local containment committed when external cleanup fails.**
  **Why:** rolling back a block because Luma or session cleanup is unavailable
  would restore access precisely when containment is needed.
  **How to apply:** report partial completion and allow cleanup retries without
  replacing the original blocking decision or audit record.

- **Session deletion is cleanup, not an authorization boundary.**
  **Why:** a failed deletion or an in-flight login can leave a valid session for a
  blocked admin, including access to older routes with inline admin checks.
  **How to apply:** check current blocked state before routing every
  session-bearing request; keep pending cleanup durable rather than toast-only.

- **Blocking persistently revokes premium** (clears subscriptionStatus/premiumSource/
  premiumExpiresAt/premiumGrantedBy/premiumGrantedAt in `blockUser`), it does NOT just
  mask via `hasActivePremium`.
  **Why:** requirement is "unblock does NOT auto-restore premium." If premium were only
  masked while blocked, unblocking would silently restore it.
  **How to apply:** never make unblock restore premium; admins re-grant manually.

- **`canSendTo()` in server/email.ts is fail-closed** (returns false on DB error).
  **Why:** the guarantee is "zero outbound email to blocked users"; failing open could
  leak email during a transient DB error.
  **How to apply:** keep fail-closed; if all email mysteriously stops, check this gate's
  DB query first.

- **Session invalidation uses connect-pg-simple's `session` table with a `json` `sess`
  column.** Delete with `sess::jsonb -> 'userId' = '<id>'::jsonb` (the userId is stored
  as a JSON number, so cast the id string to jsonb — it parses as a number).

