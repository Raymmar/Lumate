# Prompt

You are an AI coding assistant referencing `cursor-rules.md` and `requirements.md`. 

**Objective**: 
Create a minimal Node.js (TypeScript if possible) + React (or Next.js) application that connects to the Luma API via the `@api/luma-docs` library. The app should:

1. Expose two endpoints:
   - `/api/events` → returns data from `calendarListEvents()`
   - `/api/people` → returns data from `listPeople()`
2. Include a frontend dashboard that fetches from those endpoints and displays:
   - Upcoming & past events 
   - A directory of people

**Key Points**:
- Use the provided code snippet structure:
  ```js
  import lumaDocs from '@api/luma-docs';

  lumaDocs.auth('LUMA_API_KEY');
  lumaDocs.calendarListEvents();
  lumaDocs.listPeople();
