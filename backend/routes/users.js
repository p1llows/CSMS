const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../config/database');
const { authenticateToken, requireAdminOrFaculty, requireAdmin } = require('../middleware/auth');
const { paginationSchema, userCreateSchema, userUpdateSchema } = require('../utils/validation');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Bulk sync students via Excel (Admin only)
router.post('/bulk-sync', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return res.status(400).json({ error: 'Uploaded workbook is empty' });
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const normalizeKey = (k) => (k || '').toString().trim().toLowerCase();

    const results = {
      created: 0,
      updated: 0,
      deleted: 0,
      notDeletedDueToRelations: 0,
      errors: 0,
      details: []
    };

    const fileStudentIds = new Set();
    const fileEmails = new Set();

    for (let index = 0; index < rows.length; index++) {
      const raw = rows[index] || {};
      const map = {};
      for (const key of Object.keys(raw)) map[normalizeKey(key)] = raw[key];

      const fullName = (map['student name'] || map['name'] || '').toString().trim();
      const section = (map['section'] || '').toString().trim() || null;
      const yearLevelVal = (map['year level'] || map['year'] || '').toString().trim();
      const email = (map['email'] || '').toString().trim();
      const studentId = (map['student id number'] || map['student id'] || map['school id'] || '').toString().trim();

      if (!fullName || !email || !studentId) {
        results.errors++;
        results.details.push({ row: index + 2, status: 'error', reason: 'Missing required fields (Name, Email, Student ID)' });
        continue;
      }

      fileStudentIds.add(studentId);
      fileEmails.add(email);

      const parts = fullName.split(/\s+/).filter(Boolean);
      const first_name = parts[0] || '';
      const last_name = parts.slice(1).join(' ') || '';

      let year_level = null;
      if (yearLevelVal !== '') {
        const n = Number(yearLevelVal);
        if (!Number.isNaN(n)) year_level = n;
      }

      try {
        const existingRes = await db.query(
          `SELECT id, role FROM users WHERE student_id = $1 OR email = $2 LIMIT 1`,
          [studentId, email]
        );
        const existing = existingRes.rows[0];

        if (existing) {
          await db.query(
            `UPDATE users 
             SET role = 'student', student_id = $1, email = $2, first_name = $3, last_name = $4,
                 year_level = $5, section = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7`,
            [studentId, email, first_name, last_name, year_level, section, existing.id]
          );
          results.updated++;
          results.details.push({ row: index + 2, status: 'updated', student_id: studentId, email });
        } else {
          const password_hash = await bcrypt.hash(studentId, 12);
          await db.query(
            `INSERT INTO users (student_id, email, password_hash, first_name, last_name, role, year_level, section)
             VALUES ($1, $2, $3, $4, $5, 'student', $6, $7)`,
            [studentId, email, password_hash, first_name, last_name, year_level, section]
          );
          results.created++;
          results.details.push({ row: index + 2, status: 'created', student_id: studentId, email });
        }
      } catch (e) {
        console.error('Bulk sync upsert error at row', index + 2, e);
        results.errors++;
        results.details.push({ row: index + 2, status: 'error', reason: e?.message || 'Failed to upsert user' });
      }
    }

    // Second pass: delete students not present in the uploaded file
    const existingStudentsRes = await db.query(
      `SELECT id, student_id, email FROM users WHERE LOWER(role) = 'student'`
    );

    for (const s of existingStudentsRes.rows) {
      const sid = (s.student_id || '').toString().trim();
      const em = (s.email || '').toString().trim();
      const inFile = (sid && fileStudentIds.has(sid)) || (em && fileEmails.has(em));
      if (inFile) continue;
      try {
        await db.query('DELETE FROM users WHERE id = $1', [s.id]);
        results.deleted++;
      } catch {
        results.notDeletedDueToRelations++;
        results.details.push({ id: s.id, status: 'not_deleted', reason: 'Related records exist' });
      }
    }

    res.json({ summary: results });
  } catch (error) {
    console.error('Bulk sync error:', error);
    res.status(500).json({ error: 'Failed to process bulk sync' });
  }
});

// Get users (Admin/Faculty only)
router.get('/', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { role, search } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (role) {
      conditions.push(`LOWER(role) = $${paramIdx++}`);
      params.push(role.toString().toLowerCase());
    }

    if (search) {
      conditions.push(`(first_name ILIKE $${paramIdx} OR last_name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR student_id ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM users ${whereClause}`, params);
    const total = countRes.rows[0]?.total || 0;

    const selectSql = `
      SELECT id, student_id, first_name, last_name, email, role, year_level, section, created_at
      FROM users
      ${whereClause}
      ORDER BY last_name ASC, first_name ASC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limit, offset);

    const result = await db.query(selectSql, params);

    const mapped = result.rows.map(u => ({
      id: u.id,
      schoolId: u.student_id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim(),
      email: u.email,
      role: (u.role || '').toUpperCase(),
      department: null,
      yearLevel: u.year_level ?? null,
      yearSection: u.section || null,
      createdAt: u.created_at,
      first_name: u.first_name,
      last_name: u.last_name,
      student_id: u.student_id,
      section: u.section
    }));

    res.json({
      users: mapped,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, student_id, first_name, last_name, email, role, year_level, section, created_at
       FROM users 
       WHERE id = $1`,
      [Number(id)]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        schoolId: user.student_id,
        name: [user.first_name, user.last_name].filter(Boolean).join(' ').trim(),
        email: user.email,
        role: (user.role || '').toUpperCase(),
        department: null,
        yearLevel: user.year_level ?? null,
        yearSection: user.section || null,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const input = userCreateSchema.parse(req.body);

    const existingRes = await db.query(
      `SELECT id FROM users WHERE email = $1 OR (student_id = $2 AND student_id IS NOT NULL)`,
      [input.email, input.student_id || null]
    );

    if (existingRes.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email or school ID already exists' });
    }

    const password_hash = await bcrypt.hash(input.password, 12);

    const insertRes = await db.query(
      `INSERT INTO users (student_id, first_name, last_name, email, role, section, year_level, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, student_id, first_name, last_name, email, role, year_level, section, created_at`,
      [
        input.student_id || null,
        input.first_name,
        input.last_name,
        input.email,
        input.role.toLowerCase(),
        input.section ?? null,
        input.year_level ?? null,
        password_hash
      ]
    );

    const created = insertRes.rows[0];

    const mappedUser = {
      id: created.id,
      schoolId: created.student_id,
      name: [created.first_name, created.last_name].filter(Boolean).join(' ').trim(),
      email: created.email,
      role: (created.role || '').toUpperCase(),
      department: null,
      yearLevel: created.year_level ?? null,
      yearSection: created.section || null,
      createdAt: created.created_at
    };

    res.status(201).json({ user: mappedUser });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const input = userUpdateSchema.parse(req.body);

    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (input.first_name !== undefined) {
      updates.push(`first_name = $${paramIdx++}`);
      params.push(input.first_name);
    }
    if (input.last_name !== undefined) {
      updates.push(`last_name = $${paramIdx++}`);
      params.push(input.last_name);
    }
    if (input.email !== undefined) {
      updates.push(`email = $${paramIdx++}`);
      params.push(input.email);
    }
    if (input.role !== undefined) {
      updates.push(`role = $${paramIdx++}`);
      params.push(input.role.toLowerCase());
    }
    if (input.section !== undefined) {
      updates.push(`section = $${paramIdx++}`);
      params.push(input.section ?? null);
    }
    if (input.year_level !== undefined) {
      updates.push(`year_level = $${paramIdx++}`);
      params.push(input.year_level ?? null);
    }
    if (input.student_id !== undefined) {
      updates.push(`student_id = $${paramIdx++}`);
      params.push(input.student_id);
    }
    if (input.password !== undefined) {
      const hash = await bcrypt.hash(input.password, 12);
      updates.push(`password_hash = $${paramIdx++}`);
      params.push(hash);
    }

    if (updates.length === 0) {
      const existing = await db.query('SELECT * FROM users WHERE id = $1', [Number(id)]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const u = existing.rows[0];
      return res.json({
        user: {
          id: u.id,
          schoolId: u.student_id,
          name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim(),
          email: u.email,
          role: (u.role || '').toUpperCase(),
          department: null,
          yearLevel: u.year_level ?? null,
          yearSection: u.section || null,
          createdAt: u.created_at
        }
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(Number(id));

    const updateSql = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIdx} 
      RETURNING id, student_id, first_name, last_name, email, role, year_level, section, created_at
    `;

    const result = await db.query(updateSql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = result.rows[0];
    res.json({
      user: {
        id: updated.id,
        schoolId: updated.student_id,
        name: [updated.first_name, updated.last_name].filter(Boolean).join(' ').trim(),
        email: updated.email,
        role: (updated.role || '').toUpperCase(),
        department: null,
        yearLevel: updated.year_level ?? null,
        yearSection: updated.section || null,
        createdAt: updated.created_at
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [Number(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Cannot delete user due to related records. Remove related data first.' });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Bulk upload students via Excel (Admin only)
router.post('/bulk-upload', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return res.status(400).json({ error: 'Uploaded workbook is empty' });
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const results = {
      created: 0,
      skippedDuplicates: 0,
      errors: 0,
      details: []
    };

    const normalizeKey = (k) => (k || '').toString().trim().toLowerCase();

    for (let index = 0; index < rows.length; index++) {
      const raw = rows[index] || {};
      const map = {};
      for (const key of Object.keys(raw)) map[normalizeKey(key)] = raw[key];

      const fullName = (map['student name'] || map['name'] || '').toString().trim();
      const section = (map['section'] || '').toString().trim() || null;
      const yearLevelVal = (map['year level'] || map['year'] || '').toString().trim();
      const email = (map['email'] || '').toString().trim();
      const studentId = (map['student id number'] || map['student id'] || map['school id'] || '').toString().trim();

      if (!fullName || !email || !studentId) {
        results.errors++;
        results.details.push({ row: index + 2, status: 'error', reason: 'Missing required fields (Name, Email, Student ID)' });
        continue;
      }

      const parts = fullName.split(/\s+/).filter(Boolean);
      const first_name = parts[0] || '';
      const last_name = parts.slice(1).join(' ') || '';

      let year_level = null;
      if (yearLevelVal !== '') {
        const n = Number(yearLevelVal);
        if (!Number.isNaN(n)) year_level = n;
      }

      try {
        const existingRes = await db.query(
          `SELECT id FROM users WHERE email = $1 OR student_id = $2 LIMIT 1`,
          [email, studentId]
        );
        if (existingRes.rows.length > 0) {
          results.skippedDuplicates++;
          results.details.push({ row: index + 2, status: 'skipped', reason: 'Duplicate by email or student ID' });
          continue;
        }

        const password_hash = await bcrypt.hash(studentId, 12);
        await db.query(
          `INSERT INTO users (student_id, email, password_hash, first_name, last_name, role, year_level, section)
           VALUES ($1, $2, $3, $4, $5, 'student', $6, $7)`,
          [studentId, email, password_hash, first_name, last_name, year_level, section]
        );

        results.created++;
        results.details.push({ row: index + 2, status: 'created', student_id: studentId, email });
      } catch (e) {
        console.error('Bulk create error at row', index + 2, e);
        results.errors++;
        results.details.push({ row: index + 2, status: 'error', reason: e?.message || 'Failed to create user' });
      }
    }

    res.json({ summary: results });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Failed to process bulk upload' });
  }
});

// Get students with stats
router.get('/students/stats', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { search } = req.query;

    const conditions = ["LOWER(role) = 'student'"];
    const params = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(first_name ILIKE $${paramIdx} OR last_name ILIKE $${paramIdx} OR student_id ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM users ${whereClause}`, params);
    const total = countRes.rows[0]?.total || 0;

    const querySql = `
      SELECT id, student_id, first_name, last_name, email, section
      FROM users
      ${whereClause}
      ORDER BY last_name ASC, first_name ASC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limit, offset);

    const usersRes = await db.query(querySql, params);
    const students = usersRes.rows;

    let renderedMap = {};
    let penaltyMap = {};

    if (students.length > 0) {
      const studentIds = students.map(s => s.id);
      const [renderedRes, penaltyRes] = await Promise.all([
        db.query(
          `SELECT user_id, COALESCE(SUM(hours), 0)::int AS total
           FROM service_hours
           WHERE user_id = ANY($1) AND LOWER(type) = 'task'
           GROUP BY user_id`,
          [studentIds]
        ),
        db.query(
          `SELECT user_id, COALESCE(SUM(hours), 0)::int AS total
           FROM service_hours
           WHERE user_id = ANY($1) AND LOWER(type) = 'penalty'
           GROUP BY user_id`,
          [studentIds]
        )
      ]);

      renderedMap = Object.fromEntries(renderedRes.rows.map(r => [r.user_id, r.total]));
      penaltyMap = Object.fromEntries(penaltyRes.rows.map(r => [r.user_id, r.total]));
    }

    const mapped = students.map(s => ({
      id: s.id,
      schoolId: s.student_id,
      name: [s.first_name, s.last_name].filter(Boolean).join(' ').trim(),
      email: s.email,
      department: null,
      yearSection: s.section || null,
      stats: {
        totalRenderedHours: renderedMap[s.id] || 0,
        totalPenaltyHours: penaltyMap[s.id] || 0,
        balanceHours: Math.max((penaltyMap[s.id] || 0) - (renderedMap[s.id] || 0), 0)
      }
    }));

    res.json({
      students: mapped,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get students with stats error:', error);
    res.status(500).json({ error: 'Failed to fetch student statistics' });
  }
});

module.exports = router;
