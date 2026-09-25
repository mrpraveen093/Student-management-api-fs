import express from 'express';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { MongoClient } from 'mongodb';
import net from 'net';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAiRouter } from './routes/aiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();

    probe.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
        return;
      }

      reject(error);
    });

    probe.once('listening', () => {
      probe.close(() => resolve(startPort));
    });

    probe.listen(startPort, '0.0.0.0');
  });
}

// Default students
const defaultStudents = [
  {
    id: '1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@university.edu',
    rollNumber: 'CS-2024-001',
    course: 'Computer Science',
    grade: 'A (3.9 GPA)',
    status: 'Active',
    createdAt: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 15
    ).toISOString(),
  },
  {
    id: '2',
    name: 'Sophia Chen',
    email: 'sophia.chen@university.edu',
    rollNumber: 'CS-2024-042',
    course: 'Software Engineering',
    grade: 'A- (3.7 GPA)',
    status: 'Active',
    createdAt: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 12
    ).toISOString(),
  },
  {
    id: '3',
    name: 'Marcus Johnson',
    email: 'm.johnson@university.edu',
    rollNumber: 'DS-2024-018',
    course: 'Data Science & AI',
    grade: 'B+ (3.4 GPA)',
    status: 'Active',
    createdAt: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 8
    ).toISOString(),
  },
  {
    id: '4',
    name: 'Elena Rostova',
    email: 'elena.rostova@university.edu',
    rollNumber: 'IT-2023-099',
    course: 'Information Technology',
    grade: 'A (4.0 GPA)',
    status: 'Graduated',
    createdAt: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 40
    ).toISOString(),
  },
  {
    id: '5',
    name: 'Priya Patel',
    email: 'priya.patel@university.edu',
    rollNumber: 'ECE-2024-015',
    course: 'Electronics & Communication',
    grade: 'B (3.1 GPA)',
    status: 'Inactive',
    createdAt: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 3
    ).toISOString(),
  },
];

const studentsFile = path.resolve(__dirname, 'students.json');

function loadStudents() {
  if (!existsSync(studentsFile)) {
    return [...defaultStudents];
  }

  try {
    return JSON.parse(
      readFileSync(studentsFile, 'utf8')
    );
  } catch {
    return [...defaultStudents];
  }
}

function saveStudents() {
  writeFileSync(
    studentsFile,
    JSON.stringify(students, null, 2) + '\n',
    'utf8'
  );
}

let students = loadStudents();
let mongoClient = null;
let mongoStudents = null;

// Initialize MongoDB
async function initializeStorage() {
  const mongoUri =
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017';

  mongoClient = new MongoClient(mongoUri);

  await mongoClient.connect();

  const database = mongoClient.db(
    process.env.MONGODB_DATABASE ||
      'student_management'
  );

  mongoStudents = database.collection('students');

  const storedStudents = await mongoStudents
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  if (storedStudents.length === 0) {
    await mongoStudents.insertMany(
      defaultStudents.map((student) => ({
        ...student,
        _id: student.id,
      }))
    );
  } else {
    students = storedStudents.map(
      ({ _id, ...student }) => student
    );
  }

  console.log(
    `MongoDB connected: ${database.databaseName}.students`
  );
}

// Save students
async function persistStudents() {
  if (mongoStudents) {
    await mongoStudents.deleteMany({});

    if (students.length > 0) {
      await mongoStudents.insertMany(
        students.map((student) => ({
          ...student,
          _id: student.id,
        }))
      );
    }

    return;
  }

  saveStudents();
}

// Start server
async function startServer() {
  try {
    await initializeStorage();
  } catch (error) {
    console.error(
      'MongoDB connection failed; using students.json storage:',
      error
    );

    mongoClient = null;
    mongoStudents = null;
    students = loadStudents();
  }

  const app = express();

  const requestedPort = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;

  const PORT = await findAvailablePort(requestedPort);

  const isProduction =
    process.env.NODE_ENV === 'production';

  // Body parsing middleware
  app.use(express.json());

  // CORS middleware
  app.use((req, res, next) => {
    res.header(
      'Access-Control-Allow-Origin',
      '*'
    );

    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );

    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  });

  // ==========================================
  // STUDENT MANAGEMENT CRUD ENDPOINTS
  // ==========================================

  const studentRouter = express.Router();

  // 1. GET /api/students
  studentRouter.get('/', (req, res) => {
    try {
      res.status(200).json(students);
    } catch (error) {
      res.status(500).json({
        message: 'Error retrieving students',
        error: String(error),
      });
    }
  });

  // 2. GET /api/students/:id
  studentRouter.get('/:id', (req, res) => {
    try {
      const student = students.find(
        (s) => s.id === req.params.id
      );

      if (!student) {
        return res.status(404).json({
          message: `Student with ID ${req.params.id} not found`,
        });
      }

      res.status(200).json(student);
    } catch (error) {
      res.status(500).json({
        message: 'Error retrieving student',
        error: String(error),
      });
    }
  });

  // 3. POST /api/students
  studentRouter.post('/', async (req, res) => {
    try {
      const {
        name,
        email,
        rollNumber,
        course,
        age,
        grade,
        marks,
        status,
      } = req.body;

      if (
        typeof name !== 'string' ||
        typeof email !== 'string' ||
        typeof rollNumber !== 'string' ||
        !name.trim() ||
        !email.trim() ||
        !rollNumber.trim()
      ) {
        return res.status(400).json({
          message:
            'Missing required fields: name, email, and rollNumber are mandatory',
        });
      }

      if (
        course !== undefined &&
        typeof course !== 'string'
      ) {
        return res.status(400).json({
          message: 'Course must be a text value',
        });
      }

      if (
        grade !== undefined &&
        typeof grade !== 'string' &&
        typeof grade !== 'number'
      ) {
        return res.status(400).json({
          message:
            'Grade must be a text or numeric value',
        });
      }

      if (
        status !== undefined &&
        !['Active', 'Inactive', 'Graduated'].includes(
          status
        )
      ) {
        return res.status(400).json({
          message:
            'Status must be Active, Inactive, or Graduated',
        });
      }

      // Check duplicate email or roll number
      const duplicate = students.find(
        (s) =>
          s.rollNumber.toLowerCase() ===
            rollNumber.trim().toLowerCase() ||
          s.email.toLowerCase() ===
            email.trim().toLowerCase()
      );

      if (duplicate) {
        return res.status(400).json({
          message:
            'A student with this roll number or email already exists',
        });
      }

      const newStudent = {
        id: String(Date.now()),
        name: name.trim(),
        email: email.trim(),
        rollNumber: rollNumber.trim(),
        course:
          course?.trim() || 'General Studies',
        age,
        grade:
          grade !== undefined && grade !== ''
            ? String(grade).trim()
            : 'N/A',
        marks,
        status: status || 'Active',
        createdAt: new Date().toISOString(),
      };

      students.unshift(newStudent);

      await persistStudents();

      res.status(201).json(newStudent);
    } catch (error) {
      res.status(500).json({
        message: 'Error creating student',
        error: String(error),
      });
    }
  });

  // 4. PUT /api/students/:id
  studentRouter.put('/:id', async (req, res) => {
    try {
      const index = students.findIndex(
        (s) => s.id === req.params.id
      );

      if (index === -1) {
        return res.status(404).json({
          message: `Student with ID ${req.params.id} not found`,
        });
      }

      const {
        name,
        email,
        rollNumber,
        course,
        age,
        grade,
        marks,
        status,
      } = req.body;

      if (name !== undefined && !name.trim()) {
        return res.status(400).json({
          message: 'Student name cannot be empty',
        });
      }

      if (email !== undefined && !email.trim()) {
        return res.status(400).json({
          message: 'Student email cannot be empty',
        });
      }

      if (
        course !== undefined &&
        typeof course !== 'string'
      ) {
        return res.status(400).json({
          message: 'Course must be a text value',
        });
      }

      if (
        grade !== undefined &&
        typeof grade !== 'string' &&
        typeof grade !== 'number'
      ) {
        return res.status(400).json({
          message:
            'Grade must be a text or numeric value',
        });
      }

      const updatedStudent = {
        ...students[index],
        ...(name !== undefined
          ? { name: name.trim() }
          : {}),
        ...(email !== undefined
          ? { email: email.trim() }
          : {}),
        ...(rollNumber !== undefined
          ? { rollNumber: rollNumber.trim() }
          : {}),
        ...(course !== undefined
          ? { course: course.trim() }
          : {}),
        ...(age !== undefined ? { age } : {}),
        ...(grade !== undefined
          ? { grade: String(grade).trim() }
          : {}),
        ...(marks !== undefined ? { marks } : {}),
        ...(status !== undefined ? { status } : {}),
      };

      students[index] = updatedStudent;

      await persistStudents();

      res.status(200).json(updatedStudent);
    } catch (error) {
      res.status(500).json({
        message: 'Error updating student',
        error: String(error),
      });
    }
  });

  // 5. DELETE /api/students/:id
  studentRouter.delete('/:id', async (req, res) => {
    try {
      const index = students.findIndex(
        (s) => s.id === req.params.id
      );

      if (index === -1) {
        return res.status(404).json({
          message: `Student with ID ${req.params.id} not found`,
        });
      }

      const deleted = students[index];

      students.splice(index, 1);

      await persistStudents();

      res.status(200).json({
        message: 'Student deleted successfully',
        deletedStudent: deleted,
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error deleting student',
        error: String(error),
      });
    }
  });

  // ==========================================
  // GEMINI AI ROUTES
  // ==========================================

  const aiRouter = createAiRouter((id) =>
    students.find((student) => student.id === id)
  );

  // AI routes
  app.use('/api/students', aiRouter);
  app.use('/students', aiRouter);

  // Student CRUD routes
  app.use('/api/students', studentRouter);
  app.use('/students', studentRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      studentCount: students.length,
    });
  });

  // Vite Integration
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(
        path.resolve(__dirname, 'dist')
      )
    );

    app.get('*', (req, res) => {
      res.sendFile(
        path.resolve(
          __dirname,
          'dist',
          'index.html'
        )
      );
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    const appUrl = `http://localhost:${PORT}`;

    if (PORT !== requestedPort) {
      console.log(`Port ${requestedPort} is busy; using port ${PORT}.`);
    }

    console.log('Student Management Server is running.');
    console.log(`Open the app: ${appUrl}`);
    console.log(`API health check: ${appUrl}/api/health`);
    console.log(`Get student by ID: ${appUrl}/api/students/1`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Stop the other server or set a different PORT in .env, then run npm run dev again.`
      );
      process.exitCode = 1;
      return;
    }

    console.error('Failed to listen for HTTP requests:', error);
    process.exitCode = 1;
  });
}

startServer().catch((err) => {
  console.error(
    'Failed to start server:',
    err
  );
});