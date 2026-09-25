# Student Management REST API Documentation

This document describes all **five CRUD endpoints** provided by the Node.js and Express Student Management REST API running on `http://localhost:3000`.

---

## Base URL
```
http://localhost:3000/api/students
```
*(Also accessible at `http://localhost:3000/students`)*

---

## Student Data Model

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Auto-generated | Unique identifier for the student |
| `name` | `string` | **Yes** | Full name of the student |
| `email` | `string` | **Yes** | University email address (must be unique) |
| `rollNumber` | `string` | **Yes** | Student ID / Roll Number (must be unique) |
| `course` | `string` | No | Degree program / Course (e.g., Computer Science) |
| `age` | `number` | No | Student age |
| `grade` | `string` | No | Current grade or GPA (e.g., "A (3.8 GPA)") |
| `marks` | `object` | No | Subject marks for `DSA`, `python`, `java`, and `javascript` |
| `status` | `string` | No | `"Active"` \| `"Inactive"` \| `"Graduated"` (defaults to `"Active"`) |
| `createdAt` | `string` | Auto-generated | ISO timestamp of record creation |

---

## The 5 CRUD Endpoints

### 1. Read All Students (READ)
Retrieves the complete list of all student records.

- **Method:** `GET`
- **Endpoint:** `/api/students`
- **Request Headers:** None required
- **Request Body:** None

#### Success Response (200 OK)
```json
[
  {
    "id": "1",
    "name": "Aarav Sharma",
    "email": "aarav.sharma@university.edu",
    "rollNumber": "CS-2024-001",
    "course": "Computer Science",
    "grade": "A (3.9 GPA)",
    "status": "Active",
    "createdAt": "2026-09-07T12:00:00.000Z"
  },
  {
    "id": "2",
    "name": "Sophia Chen",
    "email": "sophia.chen@university.edu",
    "rollNumber": "CS-2024-042",
    "course": "Software Engineering",
    "grade": "A- (3.7 GPA)",
    "status": "Active",
    "createdAt": "2026-09-10T14:30:00.000Z"
  }
]
```

#### Frontend `fetch()` Example:
```javascript
fetch('http://localhost:3000/api/students')
  .then((res) => {
    if (!res.ok) throw new Error('Failed to fetch students');
    return res.json();
  })
  .then((data) => console.log(data))
  .catch((err) => console.error(err));
```

---

### 2. Read Single Student by ID (READ)
Retrieves detailed information for a single student matching the provided `:id`.

- **Method:** `GET`
- **Endpoint:** `/api/students/:id`
- **URL Parameters:**
  - `id` *(string, required)*: The unique ID of the student
- **Request Body:** None

#### Success Response (200 OK)
```json
{
  "id": "1",
  "name": "Aarav Sharma",
  "email": "aarav.sharma@university.edu",
  "rollNumber": "CS-2024-001",
  "course": "Computer Science",
  "grade": "A (3.9 GPA)",
  "status": "Active",
  "createdAt": "2026-09-07T12:00:00.000Z"
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Student with ID 999 not found"
}
```

#### Frontend `fetch()` Example:
```javascript
fetch('http://localhost:3000/api/students/1')
  .then((res) => {
    if (!res.ok) throw new Error('Student not found');
    return res.json();
  })
  .then((student) => console.log(student))
  .catch((err) => console.error(err));
```

---

### 3. Create Student (CREATE)
Adds a new student record to the system.

- **Method:** `POST`
- **Endpoint:** `/api/students`
- **Request Headers:**
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Liam Vance",
  "email": "liam.vance@university.edu",
  "rollNumber": "CS-2024-089",
  "course": "Computer Science",
  "grade": "A- (3.6 GPA)",
  "status": "Active"
}
```

#### Success Response (201 Created)
```json
{
  "id": "1727063529000",
  "name": "Liam Vance",
  "email": "liam.vance@university.edu",
  "rollNumber": "CS-2024-089",
  "course": "Computer Science",
  "grade": "A- (3.6 GPA)",
  "status": "Active",
  "createdAt": "2026-09-23T04:32:09.000Z"
}
```

#### Error Responses:
- **400 Bad Request** (Missing mandatory fields):
```json
{
  "message": "Missing required fields: name, email, and rollNumber are mandatory"
}
```
- **400 Bad Request** (Duplicate email or roll number):
```json
{
  "message": "A student with this roll number or email already exists"
}
```

#### Frontend `fetch()` Example:
```javascript
fetch('http://localhost:3000/api/students', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Liam Vance',
    email: 'liam.vance@university.edu',
    rollNumber: 'CS-2024-089',
    course: 'Computer Science',
    grade: 'A- (3.6 GPA)',
    status: 'Active'
  }),
})
  .then((res) => {
    if (!res.ok) throw new Error('Failed to create student');
    return res.json();
  })
  .then((newStudent) => console.log('Created:', newStudent))
  .catch((err) => console.error(err));
```

---

### 4. Update Student (UPDATE)
Updates the details of an existing student identified by `:id`.

- **Method:** `PUT`
- **Endpoint:** `/api/students/:id`
- **URL Parameters:**
  - `id` *(string, required)*: The unique ID of the student to update
- **Request Headers:**
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Liam Vance",
  "email": "liam.vance@university.edu",
  "rollNumber": "CS-2024-089",
  "course": "Cybersecurity & Systems",
  "grade": "A (3.8 GPA)",
  "status": "Active"
}
```

#### Success Response (200 OK)
```json
{
  "id": "1727063529000",
  "name": "Liam Vance",
  "email": "liam.vance@university.edu",
  "rollNumber": "CS-2024-089",
  "course": "Cybersecurity & Systems",
  "grade": "A (3.8 GPA)",
  "status": "Active",
  "createdAt": "2026-09-23T04:32:09.000Z"
}
```

#### Error Responses:
- **404 Not Found** (Student does not exist):
```json
{
  "message": "Student with ID 999 not found"
}
```
- **400 Bad Request** (Invalid field values):
```json
{
  "message": "Student name cannot be empty"
}
```

#### Frontend `fetch()` Example:
```javascript
fetch('http://localhost:3000/api/students/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Aarav Sharma',
    course: 'Artificial Intelligence',
    grade: 'A+ (4.0 GPA)',
    status: 'Active'
  }),
})
  .then((res) => {
    if (!res.ok) throw new Error('Failed to update student');
    return res.json();
  })
  .then((updatedStudent) => console.log('Updated:', updatedStudent))
  .catch((err) => console.error(err));
```

---

### 5. Delete Student (DELETE)
Removes a student record permanently from the database.

- **Method:** `DELETE`
- **Endpoint:** `/api/students/:id`
- **URL Parameters:**
  - `id` *(string, required)*: The unique ID of the student to delete
- **Request Body:** None

#### Success Response (200 OK)
```json
{
  "message": "Student deleted successfully",
  "deletedStudent": {
    "id": "1",
    "name": "Aarav Sharma",
    "email": "aarav.sharma@university.edu",
    "rollNumber": "CS-2024-001"
  }
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Student with ID 999 not found"
}
```

#### Frontend `fetch()` Example:
```javascript
fetch('http://localhost:3000/api/students/1', {
  method: 'DELETE',
})
  .then((res) => {
    if (!res.ok) throw new Error('Failed to delete student');
    return res.json();
  })
  .then((result) => console.log('Deleted successfully:', result))
  .catch((err) => console.error(err));
```

---

## Summary Table of Endpoints

| # | Action | HTTP Method | Endpoint | Status Code |
|---|---|---|---|---|
| 1 | Get all students | `GET` | `/api/students` | `200 OK` |
| 2 | Get student by ID | `GET` | `/api/students/:id` | `200 OK` / `404 Not Found` |
| 3 | Add new student | `POST` | `/api/students` | `201 Created` / `400 Bad Request` |
| 4 | Update student | `PUT` | `/api/students/:id` | `200 OK` / `404 Not Found` / `400 Bad Request` |
| 5 | Delete student | `DELETE` | `/api/students/:id` | `200 OK` / `404 Not Found` |
