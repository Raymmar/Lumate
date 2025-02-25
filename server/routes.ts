import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";

const LUMA_API_BASE = 'https://api.lu.ma/public/v1/calendar';

// Helper function to make Luma API requests
async function lumaApiRequest(endpoint: string) {
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
  console.log(`API Response for ${endpoint}:`, data); // Debug log
  return data;
}

export async function registerRoutes(app: Express) {
  app.get("/api/events", async (_req, res) => {
    try {
      const data = await lumaApiRequest('list-events');
      // Extract entries array from response
      const events = data.entries || [];
      console.log('Raw events data:', JSON.stringify(data, null, 2)); // Detailed logging
      console.log('Sending events to client:', events); // Debug log
      res.json(events);
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