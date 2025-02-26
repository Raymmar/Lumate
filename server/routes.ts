import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";

const LUMA_API_BASE = "https://api.lu.ma/public/v1";

export async function lumaApiRequest(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${LUMA_API_BASE}/${endpoint}`);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    if (!process.env.LUMA_API_KEY) {
        throw new Error("LUMA_API_KEY environment variable is not set");
    }

    console.log(`Making request to ${url.toString()}`);

    let retries = 0;
    const maxRetries = 3;
    const baseDelay = 2000; // Start with 2 second delay

    while (retries < maxRetries) {
        try {
            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    accept: "application/json",
                    "x-luma-api-key": process.env.LUMA_API_KEY,
                },
            });

            if (response.status === 429) {
                const delay = baseDelay * Math.pow(2, retries);
                console.log(`Rate limited. Waiting ${delay}ms before retry ${retries + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retries++;
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Luma API error: ${response.status} ${response.statusText}`, errorText);
                throw new Error(`Luma API error: ${response.statusText}`);
            }

            const data = await response.json();

            if (endpoint === "calendar/list-people") {
                console.log("Response details:", {
                    batchSize: data.entries?.length,
                    hasMore: data.has_more,
                    nextCursor: data.next_cursor,
                });
            }

            return data;
        } catch (error) {
            if (retries === maxRetries - 1) throw error;
            const delay = baseDelay * Math.pow(2, retries);
            console.log(`Request failed. Waiting ${delay}ms before retry ${retries + 1}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
        }
    }

    throw new Error("Max retries exceeded");
}

/**
 * Fetches all people from Luma API, handling pagination properly.
 */
export async function fetchAllPeopleFromLuma() {
    let allPeople: any[] = [];
    let cursor: string | null = null;
    const requestDelay = 2000; // 2 seconds between successful requests

    try {
        while (true) {
            const params: Record<string, string> = { limit: "50" }; // Reduced batch size
            if (cursor) {
                params.cursor = cursor;
            }

            const data = await lumaApiRequest("calendar/list-people", params);

            if (!data.entries?.length) {
                console.log("No more entries found");
                break;
            }

            allPeople = allPeople.concat(data.entries);
            console.log(`Fetched ${data.entries.length} people, Total so far: ${allPeople.length}`);

            if (!data.has_more) {
                console.log("No more pages to fetch");
                break;
            }

            cursor = data.next_cursor;
            if (!cursor) {
                console.log("No cursor returned for next page");
                break;
            }

            // Wait between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, requestDelay));
        }

        console.log(`Finished fetching all people. Total count: ${allPeople.length}`);
        return allPeople;
    } catch (error) {
        console.error("Error fetching people from Luma:", error);
        throw error;
    }
}

export async function registerRoutes(app: Express) {
    app.get("/api/events", async (_req, res) => {
        try {
            console.log("Fetching events from Luma API...");
            const eventsData = await lumaApiRequest("calendar/list-events");

            console.log("Direct Luma API events data:", {
                hasData: !!eventsData,
                entriesCount: eventsData?.entries?.length,
                sampleEntry: eventsData?.entries?.[0],
            });

            // Clear existing events and store new ones
            await storage.clearEvents();
            for (const entry of eventsData.entries) {
                const eventData = entry.event;
                await storage.insertEvent({
                    api_id: eventData.api_id,
                    title: eventData.name,
                    description: eventData.description || null,
                    startTime: eventData.start_at,
                    endTime: eventData.end_at,
                    coverUrl: eventData.cover_url || null,
                    url: eventData.url || null,
                    timezone: eventData.timezone || null,
                    location: eventData.geo_address_json ? {
                        city: eventData.geo_address_json.city,
                        region: eventData.geo_address_json.region,
                        country: eventData.geo_address_json.country,
                        latitude: eventData.geo_latitude,
                        longitude: eventData.geo_longitude,
                        full_address: eventData.geo_address_json.full_address,
                    } : null,
                    visibility: eventData.visibility || null,
                    meetingUrl: eventData.meeting_url || eventData.zoom_meeting_url || null,
                    calendarApiId: eventData.calendar_api_id || null,
                    createdAt: eventData.created_at || null,
                });
            }

            const events = await storage.getEvents();
            res.json({
                events,
                total: events.length,
            });
        } catch (error) {
            console.error("Failed to fetch events:", error);
            res.status(500).json({ error: "Failed to fetch events" });
        }
    });

    app.get("/api/people", async (req, res) => {
        try {
            console.log("Fetching all people from Luma API...");

            // Fetch all people directly from Luma API with pagination
            const allPeople = await fetchAllPeopleFromLuma();

            // Clear existing people and store new ones
            await storage.clearPeople();
            for (const person of allPeople) {
                await storage.insertPerson({
                    api_id: person.api_id,
                    email: person.email,
                    userName: person.userName || person.user?.name || null,
                    fullName: person.fullName || person.user?.full_name || null,
                    avatarUrl: person.avatarUrl || person.user?.avatar_url || null,
                    role: person.role || null,
                    phoneNumber: person.phoneNumber || person.user?.phone_number || null,
                    bio: person.bio || person.user?.bio || null,
                    organizationName: person.organizationName || person.user?.organization_name || null,
                    jobTitle: person.jobTitle || person.user?.job_title || null,
                    createdAt: person.created_at || null,
                });
            }

            // Handle pagination from request params
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;

            const start = (page - 1) * limit;
            const end = start + limit;

            // Get paginated data from our database
            const people = await storage.getPeople();
            const paginatedPeople = people.slice(start, end);

            console.log(`Returning ${paginatedPeople.length} people from index ${start} to ${end - 1}`);

            res.json({
                people: paginatedPeople,
                total: people.length,
            });
        } catch (error) {
            console.error("Failed to fetch people:", error);
            res.status(500).json({ error: "Failed to fetch people" });
        }
    });

    return createServer(app);
}