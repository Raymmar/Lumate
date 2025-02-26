# Prompt

You are an AI coding assistant referencing `cursor-rules.md` and `requirements.md`. 

**Objective**: 
Create a minimal Node.js (TypeScript if possible) + React (or Next.js) application that connects to the Luma API 

The app should:

1. Expose two endpoints:
   - `/api/events` → returns data from `calendarListEvents()`
   - `/api/people` → returns data from `listPeople()`
2. Include a frontend dashboard that fetches from those endpoints and displays:
   - Upcoming & past events 
   - A directory of people
