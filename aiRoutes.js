import express from 'express';
import { GoogleGenAI } from '@google/genai';

const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_MAX_RETRIES = 2;

function isTransientGeminiError(error) {
  return [429, 500, 503].includes(Number(error?.status));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  return new GoogleGenAI({ apiKey });
}

async function generateGeminiJson(prompt) {
  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
    try {
      const response = await getGeminiClient().models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error('Gemini returned an empty response');
      }

      return JSON.parse(text);
    } catch (error) {
      if (!isTransientGeminiError(error) || attempt === GEMINI_MAX_RETRIES) {
        throw error;
      }

      await wait(500 * 2 ** attempt);
    }
  }

  throw new Error('Gemini request could not be completed');
}

function sendGeminiError(res, error, action) {
  const message = error instanceof Error ? error.message : String(error);
  if (isTransientGeminiError(error)) {
    console.warn(`${action} is temporarily unavailable.`);
  } else {
    console.error(`${action} failed:`, error);
  }

  if (message.includes('GEMINI_API_KEY is not configured')) {
    return res.status(503).json({
      message: 'Gemini is not configured. Add GEMINI_API_KEY to the server .env file.',
    });
  }

  if ([429, 500, 503].includes(Number(error?.status))) {
    return res.status(503).json({
      message: 'Gemini is temporarily unavailable. Please try again shortly.',
    });
  }

  return res.status(502).json({
    message: `Gemini ${action.toLowerCase()} failed. Check the server logs for details.`,
  });
}

function getSubjectMarks(student) {
  const subjects = {
    DSA: student.marks?.DSA,
    Python: student.marks?.python,
    Java: student.marks?.java,
    JavaScript: student.marks?.javascript,
  };

  if (Object.values(subjects).some((mark) => typeof mark !== 'number')) {
    throw new Error('Student subject marks are incomplete or invalid');
  }

  return subjects;
}

function createFallbackStudyPlan(subjects) {
  const subjectsByPriority = Object.entries(subjects).sort(
    ([, firstMark], [, secondMark]) => firstMark - secondMark
  );

  return Array.from({ length: 7 }, (_, dayIndex) => {
    const [subject] = subjectsByPriority[dayIndex % subjectsByPriority.length];

    return {
      day: dayIndex + 1,
      focus: `${subject} study and practice`,
      tasks: [
        `Review the basic concepts of ${subject}`,
        `Complete beginner-friendly ${subject} practice exercises`,
      ],
    };
  });
}

function createFallbackPerformanceAnalysis(subjects) {
  const subjectEntries = Object.entries(subjects);
  const totalMarks = subjectEntries.reduce(
    (total, [, mark]) => total + mark,
    0
  );
  const strongestSubject = subjectEntries.reduce(
    (best, current) => (current[1] > best[1] ? current : best)
  )[0];
  const weakestSubject = subjectEntries.reduce(
    (weakest, current) => (current[1] < weakest[1] ? current : weakest)
  )[0];

  return {
    summary: 'Performance summary created from the student subject marks.',
    totalMarks,
    averagePercentage: totalMarks / subjectEntries.length,
    strongestSubject,
    weakestSubject,
    recommendations: [
      `Continue practicing ${strongestSubject} to maintain the strongest result.`,
      `Spend extra practice time on ${weakestSubject}.`,
    ],
  };
}

export function createAiRouter(getStudentById) {
  const router = express.Router();

  router.post('/:id/performance-analysis', async (req, res) => {
    try {
      const student = getStudentById(req.params.id);

      if (!student) {
        return res.status(404).json({
          message: `Student with ID ${req.params.id} not found`,
        });
      }

      if (!student.marks) {
        return res.status(400).json({
          message: 'This student has no subject marks to analyze',
        });
      }

      const subjects = getSubjectMarks(student);

      const subjectEntries = Object.entries(subjects);

      const totalMarks = subjectEntries.reduce(
        (total, [, mark]) => total + mark,
        0
      );

      const averagePercentage = totalMarks / subjectEntries.length;

      const strongestSubject = subjectEntries.reduce(
        (best, current) => (current[1] > best[1] ? current : best)
      )[0];

      const weakestSubject = subjectEntries.reduce(
        (weakest, current) => (current[1] < weakest[1] ? current : weakest)
      )[0];

      let generated;

      try {
        generated = await generateGeminiJson(`
Analyze this student's current marks and return only JSON with this shape:
{"summary":"string","recommendations":["string"]}

Student data:
${JSON.stringify({
  name: student.name,
  course: student.course,
  grade: student.grade,
  marks: subjects,
})}

Use only the supplied data. Do not assume attendance, previous results, assignments, syllabus details, learning difficulties, or other missing information. Keep the summary and recommendations beginner-friendly.
      `);
      } catch (error) {
        if (!isTransientGeminiError(error)) {
          throw error;
        }

        console.warn(
          'Gemini is temporarily unavailable; returning a marks-based performance analysis.'
        );
        generated = createFallbackPerformanceAnalysis(subjects);
      }

      const recommendations = Array.isArray(generated.recommendations)
        ? generated.recommendations.filter(
            (item) => typeof item === 'string'
          )
        : [];

      res.json({
        studentId: student.id,
        summary:
          typeof generated.summary === 'string'
            ? generated.summary
            : 'Performance analysis completed.',
        totalMarks,
        averagePercentage,
        strongestSubject,
        weakestSubject,
        recommendations,
      });
    } catch (error) {
      return sendGeminiError(res, error, 'Performance analysis');
    }
  });

  router.post('/:id/study-plan', async (req, res) => {
    try {
      const student = getStudentById(req.params.id);

      if (!student) {
        return res.status(404).json({
          message: `Student with ID ${req.params.id} not found`,
        });
      }

      if (!student.marks) {
        return res.status(400).json({
          message: 'This student has no subject marks for a study plan',
        });
      }

      const subjects = getSubjectMarks(student);

      let plan;

      try {
        const generated = await generateGeminiJson(`
Create a general beginner-friendly seven-day study plan for this student. Return only JSON with this shape:
{"plan":[{"day":1,"focus":"string","tasks":["string"]}]}

Student data:
${JSON.stringify({
  name: student.name,
  course: student.course,
  grade: student.grade,
  marks: subjects,
})}

Use only the supplied course and marks. Do not assume study hours, preferred study time, exam date, syllabus, completed topics, or personal goals. Return exactly seven days and keep tasks practical.
      `);

        plan = Array.isArray(generated.plan) ? generated.plan : [];

        if (plan.length !== 7) {
          throw new Error('Gemini returned an invalid seven-day study plan');
        }
      } catch (error) {
        if (!isTransientGeminiError(error)) {
          throw error;
        }

        console.warn(
          'Gemini is temporarily unavailable; returning a marks-based study plan.'
        );
        plan = createFallbackStudyPlan(subjects);
      }

      res.json({
        studentId: student.id,
        durationDays: 7,
        plan,
      });
    } catch (error) {
      return sendGeminiError(res, error, 'Study plan generation');
    }
  });

  return router;
}