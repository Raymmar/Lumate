import { db } from '../db.js';
import { timelineEvents } from '../../shared/schema.js';
import { sql } from 'drizzle-orm';

export async function seedTimelineEvents() {
  console.log('Starting timeline events seed...');
  
  try {
    // Check if we already have timeline events
    const existing = await db.select().from(timelineEvents);
    
    if (existing.length > 0) {
      console.log('Timeline events already exist, skipping seed...');
      return { success: true, message: 'Timeline events already seeded' };
    }

    // The historical timeline data from the AboutPage
    const historicalEvents = [
      {
        date: '2023-05-01T00:00:00Z',
        title: 'The First Drinky Thinky',
        description: "May of 2023 a few friends started talking about how to connect with the broader tech community in Sarasota. A couple weeks later we organized 'Drinky Thinky'. A casual happy hour at State street. 6 people showed up.",
        imageUrl: "https://file-upload.replit.app/api/storage/images%2F1742358869475-%231%20-%20Drinky%20Thinky.jpeg",
        displayOrder: 1
      },
      {
        date: '2023-08-01T00:00:00Z',
        title: 'Growth and Momentum',
        description: "Our next event drew 12 attendees. Then 35. Then 65. Word was spreading across the region and people were driving from as far as Tampa, Orlando, Naples and even Miami to attend our events.",
        imageUrl: "https://file-upload.replit.app/api/storage/images%2F1742358937012-%232%20-%20ST%20%40%20CMPSE.jpeg",
        displayOrder: 2
      },
      {
        date: '2024-02-01T00:00:00Z',
        title: 'First Tech JAM',
        description: "A few months later we hosted our first Tech JAM with more than 130 people from around the region! Since then we've hosted more than 20 events with more than 2,000 attendees.",
        imageUrl: "https://file-upload.replit.app/api/storage/images%2F1742359075546-LAS-285.jpg",
        displayOrder: 3
      },
      {
        date: '2025-01-01T00:00:00Z',
        title: 'Sarasota Tech Summit',
        description: "In 2025 we're asking the question: Can Sarasota become a tech town? With the caveat that every town is quickly becoming a tech town. Join us as we push the city forward.",
        imageUrl: "https://file-upload.replit.app/api/storage/images%2F1742359287380-STS_Jan'25-109%20compressed.jpeg",
        displayOrder: 4
      }
    ];

    // Insert all timeline events
    await db.insert(timelineEvents).values(historicalEvents);

    console.log(`Successfully seeded ${historicalEvents.length} timeline events`);
    return { success: true, message: `Seeded ${historicalEvents.length} timeline events` };
  } catch (error) {
    console.error('Error seeding timeline events:', error);
    return { success: false, message: 'Failed to seed timeline events', error };
  }
}

// Allow the migration to be run directly from the command line
if (import.meta.url === import.meta.main) {
  seedTimelineEvents()
    .then(result => {
      console.log('Seed result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Seed failed with error:', err);
      process.exit(1);
    });
}