import { Event, InsertEvent, Person, InsertPerson } from "@shared/schema";

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  insertEvent(event: InsertEvent): Promise<Event>;
  clearEvents(): Promise<void>;
  
  // People
  getPeople(): Promise<Person[]>;
  insertPerson(person: InsertPerson): Promise<Person>;
  clearPeople(): Promise<void>;
  
  // Cache metadata
  getLastCacheUpdate(): Promise<Date | null>;
  setLastCacheUpdate(date: Date): Promise<void>;
}

export class MemStorage implements IStorage {
  private events: Map<number, Event>;
  private people: Map<number, Person>;
  private eventId: number;
  private personId: number;

  constructor() {
    this.events = new Map();
    this.people = new Map();
    this.eventId = 1;
    this.personId = 1;
  }

  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async insertEvent(event: InsertEvent): Promise<Event> {
    const id = this.eventId++;
    const newEvent = { ...event, id };
    this.events.set(id, newEvent);
    return newEvent;
  }

  async getPeople(): Promise<Person[]> {
    return Array.from(this.people.values());
  }

  async insertPerson(person: InsertPerson): Promise<Person> {
    const id = this.personId++;
    const newPerson = { ...person, id };
    this.people.set(id, newPerson);
    return newPerson;
  }
}

export const storage = new MemStorage();
