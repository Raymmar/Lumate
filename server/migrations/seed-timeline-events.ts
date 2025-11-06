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
        imageUrl: "https://file-upload.replit.app/api/storage/images%2F1742361880456-STS_May'24-2%201%201.png",
        displayOrder: 1
      },
      {
        date: '2023-08-01T00:00:00Z',
        title: 'Growth and Momentum',
        description: "Our next event drew 12 attendees. Then 35. Then 60. By the end of 2023, the community had grown to 400+ members. By May 2024, we hit 1,000 members. Now, we're 1,800+ strong.",
        imageUrl: "https://file-upload.replit.app/api/storage/images%2F1742362003362-STS_May'24-21%20compressed%20(1).jpeg",
        displayOrder: 2
      },
      {
        date: '2024-01-01T00:00:00Z',
        title: 'The First Tech Summit',
        description: "In January 2024, we hosted our first major conference: the Sarasota Tech Summit. 325 attendees gathered for a day of talks, workshops, and networking. The energy was electric!",
        imageUrl: "https://file-upload.replit.app/api/storage/images%2F1742362025949-STS_Jan'25-25%20compressed.jpeg",
        displayOrder: 3
      },
      {
        date: '2024-04-01T00:00:00Z',
        title: 'Securing Our Nonprofit Status',
        description: "April 2024 was a huge milestone. We officially became a 501(c)(3) nonprofit, solidifying our commitment to serving the Sarasota tech community.",
        imageUrl: 'https://file-upload.replit.app/api/storage/images%2F1742362047438-STC_April-12%201.png',
        displayOrder: 4
      },
      {
        date: '2024-05-01T00:00:00Z',
        title: 'Annual Tech Summit Returns',
        description: "May 2024's Sarasota Tech Summit was our biggest event yet. 500 attendees joined us, with speakers from major tech companies and local innovators. We focused on AI, cybersecurity, and Florida's growing tech economy.",
        imageUrl: 'https://file-upload.replit.app/api/storage/images%2F1742362072127-STC_Nov-187.jpg',
        displayOrder: 5
      },
      {
        date: '2025-01-01T00:00:00Z',
        title: 'Building the Future',
        description: "Today, we're building something special. Our monthly meetups regularly draw 100+ people, we're fostering real connections, and helping put Sarasota on the tech map.",
        imageUrl: 'https://file-upload.replit.app/api/storage/images%2F1742362091251-STC_Dec-134%20(1).jpg',
        displayOrder: 6
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