/**
 * Sarasota annual sponsorships run January 1 through December 31.
 * Use the same local business-year boundary on the server and in every browser.
 */
export function getAnnualSponsorYear(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    timeZone: "America/New_York",
  }).format(now));
}
