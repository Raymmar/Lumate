/**
 * The in-site path for a link that points at this site ("/memberships" or a full URL on the
 * current origin), or null for external links, which should keep opening in a new tab.
 */
export function internalPath(url: string | null | undefined, origin?: string): string | null {
  const value = url?.trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  const siteOrigin = origin ?? (typeof window !== "undefined" ? window.location.origin : undefined);
  if (!siteOrigin) return null;
  try {
    const parsed = new URL(value);
    if (parsed.origin !== siteOrigin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
