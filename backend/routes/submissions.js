const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdminOrFaculty, requireStudent } = require('../middleware/auth');
const { paginationSchema } = require('../utils/validation');

const router = express.Router();

// Get submissions (Admin/Faculty only)
router.get('/', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { status, task_id, user_id } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`LOWER(ta.status) = $${paramIdx++}`);
      params.push(status.toString().toLowerCase());
    }
    if (task_id) {
      conditions.push(`ta.task_id = $${paramIdx++}`);
      params.push(Number(task_id));
    }
    if (user_id) {
      conditions.push(`ta.user_id = $${paramIdx++}`);
      params.push(Number(user_id));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countSql = `SELECT COUNT(*)::int AS total FROM task_applications ta ${whereClause}`;
    const countResult = await db.query(countSql, params);
    const total = countResult.rows[0]?.total || 0;

    const querySql = `
      SELECT 
        ta.id, ta.task_id, ta.user_id, ta.status, ta.hours_rendered, ta.applied_at, ta.updated_at,
        t.id AS task_ref_id, t.title AS task_title, t.hours_offered AS task_hours, t.task_date,
        u.id AS user_ref_id, u.first_name, u.last_name, u.student_id
      FROM task_applications ta
      LEFT JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN users u ON ta.user_id = u.id
      ${whereClause}
      ORDER BY ta.applied_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limit, offset);

    const result = await db.query(querySql, params);

    const submissions = result.rows.map(a => ({
      id: a.id,
      task_id: a.task_id,
      user_id: a.user_id,
      status: (a.status || '').toLowerCase(),
      hours_rendered: a.hours_rendered || 0,
      applied_at: a.applied_at,
      updated_at: a.updated_at,
      task: {
        id: a.task_ref_id || a.task_id,
        title: a.task_title || '',
        hours_offered: a.task_hours || 0,
        task_date: a.task_date || null
      },
      user: {
        id: a.user_ref_id || a.user_id,
        name: [a.first_name, a.last_name].filter(Boolean).join(' ').trim(),
        student_id: a.student_id || null
      }
    }));

    res.json({
      submissions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Submit task (Student only)
router.post('/:taskId/submit', authenticateToken, requireStudent, async (req, res) => {
  try {
    const { taskId } = req.params;
    const tid = Number(taskId);

    const taskResult = await db.query(
      `SELECT id, status, max_participants, current_participants, hours_offered, title
       FROM tasks 
       WHERE id = $1`,
      [tid]
    );
    const task = taskResult.rows[0];

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if ((task.status || '').toLowerCase() !== 'open') {
      return res.status(400).json({ error: 'Task is not open for submissions' });
    }

    if (task.max_participants != null && (task.current_participants || 0) >= task.max_participants) {
      return res.status(400).json({ error: 'Task capacity is full' });
    }

    const existingSub = await db.query(
      `SELECT id FROM task_applications WHERE task_id = $1 AND user_id = $2`,
      [tid, req.user.id]
    );

    if (existingSub.rows.length > 0) {
      return res.status(400).json({ error: 'You have already submitted for this task' });
    }

    const insertResult = await db.query(
      `INSERT INTO task_applications (task_id, user_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, task_id, user_id, status, applied_at`,
      [tid, req.user.id]
    );

    const app = insertResult.rows[0];

    res.status(201).json({
      submission: {
        id: app.id,
        task_id: app.task_id,
        user_id: app.user_id,
        status: app.status,
        applied_at: app.applied_at,
        task: { title: task.title || '', hours_offered: task.hours_offered || 0 }
      }
    });
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({ error: 'Failed to submit task' });
  }
});

// Review submission (Admin/Faculty only)
router.patch('/:id/review', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { status } = req.body;

    const subResult = await db.query(
      `SELECT 
         ta.id, ta.task_id, ta.user_id, ta.status,
         t.id AS t_id, t.created_by, t.hours_offered, t.max_participants, t.current_participants
       FROM task_applications ta
       LEFT JOIN tasks t ON ta.task_id = t.id
       WHERE ta.id = $1`,
      [Number(id)]
    );

    const submission = subResult.rows[0];
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if ((submission.status || '').toLowerCase() !== 'pending') {
      return res.status(400).json({ error: 'Submission has already been reviewed' });
    }

    if (req.user.role === 'FACULTY' && submission.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const newStatus = (status || '').toLowerCase();
    if (!['approved', 'rejected'].includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await client.query('BEGIN');

    const updateAppRes = await client.query(
      `UPDATE task_applications 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [newStatus, submission.id]
    );
    const updated = updateAppRes.rows[0];

    let hoursRecorded = 0;
    if (newStatus === 'approved') {
      const hours = submission.hours_offered || 0;
      hoursRecorded = hours;

      await client.query(
        `INSERT INTO service_hours (user_id, hours, type, source_id, source_type, description, recorded_by)
         VALUES ($1, $2, 'task', $3, 'task', 'Task approved', $4)`,
        [submission.user_id, hours, submission.task_id, req.user.id]
      );

      if (submission.max_participants != null && (submission.current_participants || 0) >= submission.max_participants) {
        throw new Error('Task capacity is full');
      }

      await client.query(
        `UPDATE tasks 
         SET current_participants = COALESCE(current_participants, 0) + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [submission.task_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      submission: {
        id: updated.id,
        task_id: updated.task_id,
        user_id: updated.user_id,
        status: updated.status,
        hours_rendered: hoursRecorded,
        updated_at: updated.updated_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Review submission error:', error);
    res.status(500).json({ error: error.message || 'Failed to review submission' });
  } finally {
    client.release();
  }
});

// Get my submissions (Student only)
router.get('/my/submissions', authenticateToken, requireStudent, async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { status } = req.query;

    const conditions = ['ta.user_id = $1'];
    const params = [req.user.id];
    let paramIdx = 2;

    if (status) {
      conditions.push(`LOWER(ta.status) = $${paramIdx++}`);
      params.push(status.toString().toLowerCase());
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM task_applications ta ${whereClause}`, params);
    const total = countRes.rows[0]?.total || 0;

    const querySql = `
      SELECT 
        ta.id, ta.task_id, ta.status, ta.applied_at,
        t.title AS task_title, t.hours_offered, t.task_date
      FROM task_applications ta
      LEFT JOIN tasks t ON ta.task_id = t.id
      ${whereClause}
      ORDER BY ta.applied_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limit, offset);

    const result = await db.query(querySql, params);

    const submissions = result.rows.map(a => ({
      id: a.id,
      task_id: a.task_id,
      status: (a.status || '').toLowerCase(),
      applied_at: a.applied_at,
      task: {
        title: a.task_title || '',
        hours_offered: a.hours_offered || 0,
        task_date: a.task_date || null
      }
    }));

    res.json({
      submissions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get my submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch your submissions' });
  }
});

module.exports = router;
