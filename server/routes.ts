import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";

// Mock data for development
const mockEvents = [
  {
    id: "1",
    title: "Team Meeting",
    description: "Weekly sync-up",
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
  }
];

const mockPeople = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "Developer"
  }
];

export async function registerRoutes(app: Express) {
  app.get("/api/events", async (_req, res) => {
    try {
      // TODO: Replace with actual Luma API integration
      res.json(mockEvents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/people", async (_req, res) => {
    try {
      // TODO: Replace with actual Luma API integration
      res.json(mockPeople);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  return createServer(app);
}