# Requirements

## 1. Goal
Create a simple web application that:
- Connects to the Luma API via a Node.js backend.
- Fetches a list of events (upcoming & past) and a list of people from the calendar.
- Displays them in a simple, modern dashboard UI.

## 2. Luma Integration
Use the following snippet (adapted for your environment):

```js
import lumaDocs from '@api/luma-docs';

lumaDocs.auth('LUMA_API_KEY');
lumaDocs.calendarListEvents()
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));
