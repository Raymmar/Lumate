import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";

const LUMA_API_BASE = 'https://api.lu.ma/public/v1';

export async function lumaApiRequest(endpoint: string, params?: Record<string, string>) {
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
    const errorText = await response.text();
    console.error(`Luma API error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Luma API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export async function registerRoutes(app: Express) {
  app.get("/api/events", async (_req, res) => {
    try {
      const events = await storage.getEvents();
      res.json({
        events,
        total: events.length
      });
    } catch (error) {
      console.error('Failed to fetch events:', error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = await lumaApiRequest('event/get', { api_id: id });
      res.json(data);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      res.status(500).json({ error: "Failed to fetch event details from Luma API" });
    }
  });

  app.get("/api/people", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);

      const { people, total } = await storage.getPeople(page, limit);
      res.json({
        people,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Failed to fetch people:', error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  return createServer(app);
}