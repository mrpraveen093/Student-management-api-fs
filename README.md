<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/68c50c31-57e5-4efc-affb-1140ff1587b8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a local `.env` file and set `GEMINI_API_KEY` to your Gemini API key. Never commit this file.
3. Run the app:
   `npm run dev`

## Frontend, Backend, and MongoDB

The frontend and Express backend run together at `http://localhost:3000`.
The frontend calls these backend routes:

- `GET /api/health`
- `GET /api/students`
- `POST /api/students`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`
- `POST /api/students/:id/performance-analysis`
- `POST /api/students/:id/study-plan`

The backend attempts to connect to local MongoDB at
`mongodb://127.0.0.1:27017` and stores records in the `student_management`
database and `students` collection. For MongoDB Atlas or another server, add
these values to a `.env` file:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DATABASE=student_management
```

If MongoDB is unavailable, the backend falls back to `students.json`, so the
frontend remains usable locally.

## Gemini AI Features

The backend uses the Gemini `gemini-3.8-flash` model for student performance
analysis and seven-day study plans. The Gemini API key is read only by
Express from `GEMINI_API_KEY`; it is never sent to the browser.

AI analysis requires a student record with subject marks. The API uses only
the student's existing course, grade, and marks and does not update the
student record.
