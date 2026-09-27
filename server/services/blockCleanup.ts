// Cleanup is deliberately outside the block transaction: an external outage must
// never roll back local containment. Every independent step is attempted.
export async function runBlockCleanup(deps: {
  deleteSessions: () => Promise<unknown>;
  getEmails: () => Promise<string[]>;
  removeEmail: (email: string) => Promise<boolean>;
  primaryEmail: string;
}): Promise<string[]> {
  const failures: string[] = [];
  try {
    await deps.deleteSessions();
  } catch {
    failures.push("Session deletion failed");
  }
  const emails = new Set([deps.primaryEmail.toLowerCase()]);
  try {
    for (const email of await deps.getEmails()) emails.add(email.toLowerCase());
  } catch {
    failures.push("Linked Luma profiles could not be loaded");
  }
  for (const email of Array.from(emails)) {
    try {
      if (!await deps.removeEmail(email)) throw new Error("Removal not confirmed");
    } catch {
      failures.push(`Luma removal failed for ${email}`);
    }
  }
  return failures;
}