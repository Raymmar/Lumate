import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";

const LUMA_API_BASE = 'https://api.lu.ma/public/v1/calendar';

// Helper function to make Luma API requests
async function lumaApiRequest(endpoint: string) {
  console.log(`Making request to ${LUMA_API_BASE}/${endpoint}`);

  const response = await fetch(`${LUMA_API_BASE}/${endpoint}`, {
    headers: {
      'accept': 'application/json',
      'x-luma-api-key': process.env.LUMA_API_KEY || ''
    }
  });

  if (!response.ok) {
    throw new Error(`Luma API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export async function registerRoutes(app: Express) {
  app.get("/api/events", async (_req, res) => {
    try {
      const data = await lumaApiRequest('list-events');
      console.log('Raw events response:', JSON.stringify(data, null, 2)); // Log full response

      // Check data structure and extract events
      if (data && Array.isArray(data.events)) {
        const events = data.events;
        console.log(`Found ${events.length} events`);
        res.json(events);
      } else {
        console.log('Unexpected events data structure:', data);
        res.json([]);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      res.status(500).json({ error: "Failed to fetch events from Luma API" });
    }
  });

  app.get("/api/people", async (_req, res) => {
    try {
      const data = await lumaApiRequest('list-people');
      // Extract entries array from response
      const people = data.entries || [];
      console.log('Raw people data:', JSON.stringify(data, null, 2)); // Detailed logging
      console.log('Sending people to client:', people); // Debug log
      res.json(people);
    } catch (error) {
      console.error('Failed to fetch people:', error);
      res.status(500).json({ error: "Failed to fetch people from Luma API" });
    }
  });

  return createServer(app);
}