import type { Express } from "express";
import { createServer } from "http";

const LUMA_API_BASE = 'https://api.lu.ma/public/v1';

// Helper function to make Luma API requests
async function lumaApiRequest(endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${LUMA_API_BASE}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  console.log(`Making request to ${url}`);

  if (!process.env.LUMA_API_KEY) {
    throw new Error('LUMA_API_KEY environment variable is not set');
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'x-luma-api-key': process.env.LUMA_API_KEY
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
      const data = await lumaApiRequest('calendar/list-events');
      console.log('Raw events data:', JSON.stringify(data, null, 2)); // Detailed logging

      // Extract entries array from response
      const events = data.entries || [];
      console.log('Sending events to client:', events); // Debug log
      res.json(events);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      res.status(500).json({ error: "Failed to fetch events from Luma API" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = await lumaApiRequest('event/get', { api_id: id });
      console.log('Raw event details data:', JSON.stringify(data, null, 2)); // Detailed logging
      res.json(data);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      res.status(500).json({ error: "Failed to fetch event details from Luma API" });
    }
  });

  app.get("/api/people", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const data = await lumaApiRequest('calendar/list-people', {
        page: page.toString(),
        limit: limit.toString()
      });

      const people = data.entries || [];
      const total = data.total || people.length;

      res.json({
        people,
        page,
        limit,
        total,
        hasMore: page * limit < total
      });
    } catch (error) {
      console.error('Failed to fetch people:', error);
      res.status(500).json({ error: "Failed to fetch people from Luma API" });
    }
  });

  return createServer(app);
}