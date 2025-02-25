# Cursor Rules

## General Guidelines
- Use **Node.js** (TypeScript if possible) for the backend, and React or Next.js for the frontend.
- Store any secrets (like Luma API keys) securely (e.g., in environment variables).
- Do not commit secrets to the repository.

## Luma Integration
- Use the `lumaDocs` library (`import lumaDocs from '@api/luma-docs';`) with the provided usage pattern.
- For now, fetch:
  - Events (`calendarListEvents`)
  - People (`listPeople`)
- Display them in a simple “dashboard” UI.

## Dashboard Requirements
- Modern, minimal design to show:
  - **Upcoming Events** (time, date, description)
  - **Past Events** (time, date, description) — if available
  - **Directory of People** (just name, email, or other relevant info from Luma)

## Code Style
- Keep it simple. Minimal routes, minimal components.
- Include basic error handling (try/catch with console logs or alert messages).
- Comments where needed to explain how the Luma data is fetched and displayed.

## Deployment & Maintenance
- Provide a straightforward way to run locally (e.g., `npm install && npm run dev`).
- For production, note any environment variable usage (e.g., `LUMA_API_KEY`).

