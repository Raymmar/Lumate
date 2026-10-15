export const SUMMIT_TICKET_DISMISSAL_COOKIE = "summit_ticket_dismissed";
export const SUMMIT_TICKET_DISMISSAL_SECONDS = 7 * 24 * 60 * 60;

export function isSummitTicketDismissed(value: string, summitId: number, now = Date.now()): boolean {
  const [id, expiresAt] = value.split(":");
  return id === String(summitId) && Number(expiresAt) > now;
}
