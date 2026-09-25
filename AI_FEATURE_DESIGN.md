# AI Feature Design

This document defines two future AI features for the existing Student Management API. It does not change or implement any existing CRUD endpoint.

## Architecture

```text
Client
  |
  v
Express API
  |
  v
MongoDB
  |
  v
Express API
  |
  v
Gemini API
  |
  v
Express API
  |
  v
Client
```

Express loads the student record from MongoDB and returns the AI result to the client. Gemini is a server-side service called by Express during the request; the Gemini API key must never be sent to the browser.

The proposed AI endpoint contract uses `POST` because both features generate a new result. This matches the existing frontend AI request helper. The current AI router declares these routes as `GET`, so that method mismatch must be corrected later when implementation begins. This design does not change any CRUD endpoint.

## 1. AI Student Performance Analysis

### Purpose

Analyze the student's current performance and provide a simple summary and recommendations.

### User Flow

1. The user opens a student profile.
2. The user selects **Analyze Performance**.
3. The client sends the student ID to Express.
4. Express loads the student from MongoDB.
5. Express sends the existing student data to Gemini.
6. Gemini generates the analysis.
7. Express returns the result to the client.
8. The client displays the result.

### Required Student Data

Existing fields that can be used:

- `name`
- `course`
- `age`
- `grade`
- `marks.DSA`
- `marks.python`
- `marks.java`
- `marks.javascript`

Data limitation: `marks` is optional, and the seeded students currently do not include marks. If marks are missing, the endpoint should return a clear validation error instead of asking Gemini to guess. The current model also does not contain attendance, previous exam results, assignment results, syllabus details, or learning difficulties. The analysis must be limited to the available current marks.

### New Endpoint

```text
POST /api/students/:id/performance-analysis
```

The endpoint generates a response and does not update the student record. Existing CRUD endpoints remain unchanged.

### Data Flow

```text
Client
  -> Express
  -> MongoDB: find student by id
  -> Express
  -> Gemini API: analyze existing marks
  -> Express
  -> Client
```

The response is generated from the current MongoDB student record and is not saved back to that record.

### Gemini Usage

Express sends Gemini the student's existing course, grade, and subject marks. Gemini returns a readable performance summary and recommendations. The API key is never sent to the browser.

### Expected Response

```json
{
  "studentId": "student-id",
  "summary": "The student is performing well overall.",
  "totalMarks": 295,
  "averagePercentage": 73.75,
  "strongestSubject": "Python",
  "weakestSubject": "Java",
  "recommendations": [
    "Practice Java fundamentals",
    "Continue solving Python problems"
  ]
}
```

## 2. AI-Generated 7-Day Study Plan

### Purpose

Create a simple seven-day study plan based on the student's current course and marks.

### User Flow

1. The user opens a student profile.
2. The user selects **Generate Study Plan**.
3. The client sends the student ID to Express.
4. Express loads the student from MongoDB.
5. Express sends the existing course and marks to Gemini.
6. Gemini creates a seven-day plan.
7. Express returns the plan to the client.
8. The client displays the daily activities.

### Required Student Data

Existing fields that can be used:

- `name`
- `course`
- `grade`
- `marks.DSA`
- `marks.python`
- `marks.java`
- `marks.javascript`

Data limitation: `marks` is optional, and the seeded students currently do not include marks. If marks are missing, the endpoint should return a clear validation error. The current model also does not contain study hours, preferred study time, exam date, syllabus, completed topics, or personal learning goals. Therefore, Gemini can create only a general plan based on the course and marks; it must not assume missing information.

### New Endpoint

```text
POST /api/students/:id/study-plan
```

The endpoint generates a plan and does not update the student record. Existing CRUD endpoints remain unchanged.

### Data Flow

```text
Client
  -> Express
  -> MongoDB: find student by id
  -> Express
  -> Gemini API: create plan from existing marks
  -> Express
  -> Client
```

### Gemini Usage

Express sends Gemini the student's course, grade, and marks. The prompt must tell Gemini that schedule and syllabus information are unavailable, so the result should be a general beginner-friendly plan.

### Expected Response

```json
{
  "studentId": "student-id",
  "durationDays": 7,
  "plan": [
    {
      "day": 1,
      "focus": "Java",
      "tasks": [
        "Review Java fundamentals",
        "Solve five beginner Java problems"
      ]
    },
    {
      "day": 2,
      "focus": "DSA",
      "tasks": [
        "Review arrays and strings",
        "Solve three beginner DSA problems"
      ]
    }
  ]
}
```

The complete response will contain all seven days. Generated results are returned to the client and are not stored in the student record unless a separate persistence feature is designed later.

## Summary of Missing Data

These features can be designed with the current model, but their results are limited because the API does not currently store:

- attendance or attendance history
- previous marks or performance trends
- assignment, quiz, or exam results
- syllabus or completed topics
- available study time, preferred schedule, or exam date
- learning goals or learning difficulties

No new student fields are required for this first version. If more personalized results are needed later, those fields should be added as a separate data-model change rather than assumed by Gemini.
