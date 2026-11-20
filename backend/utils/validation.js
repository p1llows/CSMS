const { z } = require('zod');

// User validation schemas (aligned to DB schema fields)
// We accept uppercase roles from the client but store lowercase in DB due to SQL CHECK constraint
const userCreateSchema = z.object({
  // Student ID is optional to allow creating Admin/Faculty accounts without it
  student_id: z.string().min(1, 'School ID is required').optional(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  role: z.enum(['ADMIN', 'FACULTY', 'STUDENT']),
  section: z.string().optional(),
  year_level: z.coerce.number().int().min(1).max(10).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Partial schema for updates; used to update specific user fields (admin-only flows)
const userUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  role: z.enum(['ADMIN', 'FACULTY', 'STUDENT']).optional(),
  section: z.string().nullable().optional(),
  year_level: z.coerce.number().int().min(1).max(10).nullable().optional(),
  student_id: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Event validation schemas (aligned to DB)
const eventCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['Events', 'FRC']),
  event_date: z.string().or(z.date()),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  penalty_hours: z.coerce.number().int().min(0).optional(),
  is_mandatory: z.coerce.boolean().optional()
});

const eventUpdateSchema = eventCreateSchema.partial();

// Task validation schemas (aligned to DB)
const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  hours_offered: z.coerce.number().int().min(1, 'Hours must be at least 1'),
  max_participants: z.coerce.number().int().min(1).optional(),
  location: z.string().optional(),
  task_date: z.string().or(z.date()).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional()
});

const taskUpdateSchema = taskCreateSchema.partial();

// Attendance validation schemas (aligned to DB)
const attendanceCreateSchema = z.object({
  eventId: z.coerce.number().int().min(1),
  userId: z.coerce.number().int().min(1).optional(),
  studentId: z.coerce.number().int().min(1).optional(),
  status: z.enum(['present', 'absent']).default('absent')
});

const attendanceImportSchema = z.object({
  eventId: z.coerce.number().int().min(1),
  mapping: z.object({
    schoolIdColumn: z.string().min(1, 'School ID column is required'),
    statusColumn: z.string().min(1, 'Status column is required')
  })
});

// Task submission validation schemas
const submissionCreateSchema = z.object({
  notes: z.string().optional()
});

const submissionReviewSchema = z.object({
  status: z.enum(['APPROVED', 'DENIED']),
  notes: z.string().optional()
});

// Query parameter validation
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(10)
});

const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
});

module.exports = {
  userCreateSchema,
  userUpdateSchema,
  loginSchema,
  eventCreateSchema,
  eventUpdateSchema,
  taskCreateSchema,
  taskUpdateSchema,
  attendanceCreateSchema,
  attendanceImportSchema,
  submissionCreateSchema,
  submissionReviewSchema,
  paginationSchema,
  dateRangeSchema
};
