const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrFaculty } = require('../middleware/auth');
const { attendanceImportSchema, paginationSchema } = require('../utils/validation');
const { calculateStudentStats } = require('../utils/studentStats');

const router = express.Router();
const upload = multer({ dest: 'uploads/csv/' });

// Get attendance records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { eventId, studentId, status, all } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (eventId) {
      conditions.push(`event_id = $${paramIdx++}`);
      params.push(Number(eventId));
    }
    if (studentId) {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(Number(studentId));
    }
    if (status) {
      conditions.push(`LOWER(status) = $${paramIdx++}`);
      params.push(status.toString().toLowerCase());
    }

    const role = (req.user?.role || '').toString().toUpperCase();
    if (role === 'STUDENT') {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(req.user.id);
    }

    // Special mode: load all students for a given event (unpaginated)
    if (all === 'true' && eventId) {
      const [studentsRes, recordsRes] = await Promise.all([
        db.query(`SELECT id FROM users WHERE LOWER(role) = 'student' ORDER BY last_name ASC, first_name ASC`),
        db.query(`SELECT user_id, event_id, status FROM attendance WHERE event_id = $1`, [Number(eventId)])
      ]);

      const recMap = new Map(recordsRes.rows.map(r => [r.user_id, (r.status || '').toString().toLowerCase()]));
      const merged = studentsRes.rows.map(s => ({
        user_id: s.id,
        event_id: Number(eventId),
        status: recMap.get(s.id) || 'absent'
      }));

      return res.json(merged);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const sql = `
      SELECT user_id, event_id, status 
      FROM attendance 
      ${whereClause} 
      ORDER BY recorded_at DESC 
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limit, offset);

    const result = await db.query(sql, params);
    const simplified = result.rows.map(r => ({
      user_id: r.user_id,
      event_id: r.event_id,
      status: (r.status || '').toString().toLowerCase()
    }));

    res.json(simplified);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Test endpoint
router.post('/test', authenticateToken, async (req, res) => {
  try {
    res.json({ success: true, message: 'Test endpoint working', user: req.user });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

// Create/update attendance record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { eventId, studentId, userId, status } = req.body || {};
    const normalizedStatus = (status || '').toString().toLowerCase() === 'present' ? 'present' : 'absent';

    const event_id = Number(eventId);
    const user_id = Number(studentId || userId);

    if (!event_id || !user_id) {
      return res.status(400).json({ error: 'Missing eventId or userId' });
    }

    const upsertSql = `
      INSERT INTO attendance (user_id, event_id, status, recorded_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, event_id)
      DO UPDATE SET status = EXCLUDED.status, recorded_by = EXCLUDED.recorded_by, recorded_at = CURRENT_TIMESTAMP
      RETURNING user_id, event_id, status
    `;

    const result = await db.query(upsertSql, [user_id, event_id, normalizedStatus, req.user?.id || null]);
    const record = result.rows[0];

    res.json({
      user_id: record.user_id,
      event_id: record.event_id,
      status: (record.status || '').toString().toLowerCase()
    });
  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({ error: 'Failed to create attendance record', details: error.message });
  }
});

// Import attendance from CSV (Admin only)
router.post('/import', authenticateToken, requireAdmin, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const { eventId, mapping } = attendanceImportSchema.parse({
      ...req.body,
      eventId: req.body.eventId
    });
    const { schoolIdColumn, statusColumn } = mapping;

    const results = [];
    const errors = [];

    const csvData = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => csvData.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const schoolId = row[schoolIdColumn];
      const statusValue = row[statusColumn];

      if (!schoolId || !statusValue) {
        errors.push(`Row ${i + 1}: Missing school ID or status`);
        continue;
      }

      const studentRes = await db.query('SELECT id FROM users WHERE student_id = $1', [schoolId]);
      const student = studentRes.rows[0];

      if (!student) {
        errors.push(`Row ${i + 1}: Student with school ID ${schoolId} not found`);
        continue;
      }

      const rawStatus = (statusValue || '').toString().toLowerCase();
      const normalizedStatus = (rawStatus === 'present' || rawStatus === '1' || rawStatus === 'yes') ? 'present' : 'absent';

      try {
        const upsertSql = `
          INSERT INTO attendance (user_id, event_id, status, recorded_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, event_id)
          DO UPDATE SET status = EXCLUDED.status, recorded_by = EXCLUDED.recorded_by, recorded_at = CURRENT_TIMESTAMP
          RETURNING *
        `;
        const recResult = await db.query(upsertSql, [student.id, Number(eventId), normalizedStatus, req.user.id]);
        results.push(recResult.rows[0]);

        if (normalizedStatus === 'absent') {
          await calculateStudentStats(student.id);
        }
      } catch {
        errors.push(`Row ${i + 1}: Database error for ${schoolId}`);
      }
    }

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      imported: results.length,
      errors,
      message: `Successfully imported ${results.length} attendance records`
    });
  } catch (error) {
    console.error('Import attendance error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to import attendance' });
  }
});

// Get attendance analytics for an event
router.get('/analytics/:eventId', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { eventId } = req.params;

    const [eventRes, statsRes] = await Promise.all([
      db.query(`SELECT name, type, event_date FROM events WHERE id = $1`, [Number(eventId)]),
      db.query(`
        SELECT status, COUNT(*)::int AS count
        FROM attendance
        WHERE event_id = $1
        GROUP BY status
      `, [Number(eventId)])
    ]);

    const event = eventRes.rows[0];
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const attendanceStats = statsRes.rows;
    const totalStudents = attendanceStats.reduce((sum, stat) => sum + stat.count, 0);
    const presentCount = attendanceStats.find(s => (s.status || '').toLowerCase() === 'present')?.count || 0;
    const absentCount = attendanceStats.find(s => (s.status || '').toLowerCase() === 'absent')?.count || 0;
    const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

    res.json({
      event,
      analytics: {
        totalStudents,
        presentCount,
        absentCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        hoursAssigned: absentCount * 10
      }
    });
  } catch (error) {
    console.error('Get attendance analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance analytics' });
  }
});

// Export attendance CSV
router.get('/export/:eventId', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { eventId } = req.params;

    const [eventRes, attendanceRes] = await Promise.all([
      db.query('SELECT name FROM events WHERE id = $1', [Number(eventId)]),
      db.query(`
        SELECT a.status, u.student_id, u.first_name, u.last_name, u.section
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE a.event_id = $1
        ORDER BY a.recorded_at ASC
      `, [Number(eventId)])
    ]);

    const event = eventRes.rows[0];
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const csvHeader = 'School ID,Name,Year Section,Status\n';
    const csvRows = attendanceRes.rows.map(record => {
      const name = [record.last_name, record.first_name].filter(Boolean).join(', ');
      return `${record.student_id || ''},${name},${record.section || ''},${record.status}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${(event.name || 'event').replace(/[^a-zA-Z0-9]/g, '-')}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ error: 'Failed to export attendance' });
  }
});

// Bulk endpoint for matrix view
router.get('/bulk', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { eventIds, eventType, section } = req.query || {};

    const studentConds = ["LOWER(role) = 'student'"];
    const studentParams = [];
    if (section) {
      studentConds.push(`LOWER(section) = $1`);
      studentParams.push(section.toString().toLowerCase());
    }

    const studentsRes = await db.query(`
      SELECT id, first_name, last_name, student_id, section
      FROM users
      WHERE ${studentConds.join(' AND ')}
      ORDER BY last_name ASC, first_name ASC
    `, studentParams);
    const students = studentsRes.rows;

    const ids = (eventIds || '')
      .toString()
      .split(',')
      .map(x => Number(x.trim()))
      .filter(x => Number.isFinite(x) && x > 0);

    const eventConds = [];
    const eventParams = [];
    let epIdx = 1;

    if (ids.length > 0) {
      eventConds.push(`id = ANY($${epIdx++})`);
      eventParams.push(ids);
    }

    if (eventType && String(eventType).toUpperCase() !== 'ALL') {
      eventConds.push(`type = $${epIdx++}`);
      eventParams.push(String(eventType));
    }

    const eventWhere = eventConds.length > 0 ? `WHERE ${eventConds.join(' AND ')}` : '';
    const eventsRes = await db.query(`
      SELECT id, name, type, event_date, penalty_hours
      FROM events
      ${eventWhere}
      ORDER BY event_date ASC
    `, eventParams);
    const events = eventsRes.rows;

    if (!students.length || !events.length) {
      return res.json({ students, events, records: [] });
    }

    const studentIds = students.map(s => s.id);
    const eventIdList = events.map(e => e.id);

    const attRes = await db.query(`
      SELECT user_id, event_id, status
      FROM attendance
      WHERE user_id = ANY($1) AND event_id = ANY($2) AND LOWER(status) = 'present'
    `, [studentIds, eventIdList]);

    const presentSet = new Set(attRes.rows.map(a => `${a.user_id}-${a.event_id}`));

    const records = [];
    for (const s of students) {
      for (const ev of events) {
        const key = `${s.id}-${ev.id}`;
        records.push({ user_id: s.id, event_id: ev.id, status: presentSet.has(key) ? 'present' : 'absent' });
      }
    }

    return res.json({ students, events, records });
  } catch (error) {
    console.error('Bulk attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch bulk attendance' });
  }
});

module.exports = router;
