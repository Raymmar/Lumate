import {
  LUMA_SUMMIT_FIELDS,
  type Event,
  type LumaSummitValues,
  type SummitWithSponsor,
} from "@shared/schema";
import { storage } from "../storage";

/** YYYY-MM-DD of an instant as seen in the event's timezone (UTC when unknown). */
export function dateInTimezone(value: string, timezone: string | null): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const format = (timeZone: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  try {
    return format(timezone || "UTC");
  } catch {
    // Unknown timezone name from Luma
    return format("UTC");
  }
}

/** The summit fields a synced Luma event supplies. */
export function lumaValuesFromEvent(event: Event): LumaSummitValues {
  const location = event.location ?? null;
  const venueName = location?.venue_name?.trim() || null;
  let venueAddress = location?.full_address?.trim() || null;
  // Luma's full address usually starts with the place name; don't repeat it under the venue name
  if (venueName && venueAddress?.startsWith(`${venueName}, `)) {
    venueAddress = venueAddress.slice(venueName.length + 2);
  }
  const mapQuery =
    location?.full_address?.trim() ||
    (location?.latitude && location?.longitude ? `${location.latitude},${location.longitude}` : null);
  return {
    startDate: dateInTimezone(event.startTime, event.timezone),
    endDate: dateInTimezone(event.endTime, event.timezone),
    description: event.description?.trim() || null,
    venueName,
    venueAddress,
    venueMapUrl: mapQuery
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
      : null,
    ticketUrl: event.url || null,
    seoImage: event.coverUrl || null,
  };
}

function ownValues(summit: SummitWithSponsor): LumaSummitValues {
  return Object.fromEntries(LUMA_SUMMIT_FIELDS.map((key) => [key, summit[key] ?? null])) as LumaSummitValues;
}

/**
 * Returns summits with their effective values: for linked summits, each
 * Luma-supplied field comes from the synced event unless overridden. A missing
 * event falls back to the summit's own values. Admins also get `lumaLink`.
 * Never save the result back; it is for reading only.
 */
export async function withLumaValues(
  summits: SummitWithSponsor[],
  options: { isAdmin: boolean },
): Promise<SummitWithSponsor[]> {
  const apiIds = Array.from(new Set(summits.map((s) => s.lumaEventApiId).filter((id): id is string => !!id)));
  if (apiIds.length === 0) return summits;
  const found = await Promise.all(apiIds.map((apiId) => storage.getEventByApiId(apiId)));
  const eventsById = new Map(apiIds.map((apiId, i) => [apiId, found[i]]));

  return summits.map((summit) => {
    if (!summit.lumaEventApiId) return summit;
    const event = eventsById.get(summit.lumaEventApiId) ?? null;
    const own = ownValues(summit);
    const values = event ? lumaValuesFromEvent(event) : null;
    const merged: SummitWithSponsor = { ...summit };
    if (values) {
      const overrides = new Set(summit.lumaOverrides ?? []);
      for (const key of LUMA_SUMMIT_FIELDS) {
        if (!overrides.has(key)) merged[key] = values[key];
      }
    }
    if (options.isAdmin) {
      merged.lumaLink = {
        apiId: summit.lumaEventApiId,
        event: event
          ? { title: event.title, startTime: event.startTime, timezone: event.timezone, url: event.url }
          : null,
        broken: !event,
        values,
        own,
      };
    }
    return merged;
  });
}

export async function oneWithLumaValues(
  summit: SummitWithSponsor | null,
  options: { isAdmin: boolean },
): Promise<SummitWithSponsor | null> {
  if (!summit) return null;
  const [merged] = await withLumaValues([summit], options);
  return merged;
}
