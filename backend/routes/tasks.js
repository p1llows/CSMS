const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdminOrFaculty } = require('../middleware/auth');
const { paginationSchema } = require('../utils/validation');

const router = express.Router();

// Helper to map DB task -> frontend expected shape
function mapTask(t, currentUserRole) {
  return {
    id: t.id,
    title: t.title,
    description: t.description || '',
    hours_offered: t.hours_offered,
    max_participants: t.max_participants ?? null,
    location: t.location || '',
    task_date: t.task_date || null,
    start_time: t.start_time || null,
    end_time: t.end_time || null,
    status: (t.status || '').toString().toLowerCase(),
    created_by_name: null,
    approved_count: (typeof t.approved_count === 'number' ? t.approved_count : (t.current_participants ?? 0)),
    current_participants: t.current_participants ?? 0
  };
}

// Get tasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { status, search, available } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`LOWER(status) = $${paramIdx++}`);
      params.push(status.toString().toLowerCase());
    }

    if (req.user.role === 'STUDENT') {
      conditions.push(`LOWER(status) = 'open'`);
    }

    if (search) {
      conditions.push(`(title ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const filterAvailable = available && available.toString().toLowerCase() === 'true';

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const fetchLimit = filterAvailable ? Math.max(limit * 3, 100) : limit;
    const offset = filterAvailable ? 0 : (page - 1) * limit;

    const sql = `
      SELECT * FROM tasks
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(fetchLimit, offset);

    const result = await db.query(sql, params);
    const tasks = result.rows;

    let hiddenTaskIds = null;
    if (filterAvailable && (req.user.role || '').toUpperCase() === 'STUDENT') {
      const myAppsRes = await db.query(
        `SELECT task_id FROM task_applications WHERE user_id = $1 AND LOWER(status) != 'rejected'`,
        [req.user.id]
      );
      hiddenTaskIds = new Set(myAppsRes.rows.map(p => p.task_id));
    }

    let filtered = tasks;
    if (filterAvailable) {
      filtered = tasks.filter(t => {
        const isOpen = (t.status || '').toLowerCase() === 'open';
        const max = t.max_participants == null ? null : Number(t.max_participants);
        const approved = Number(t.current_participants || 0);
        const isHiddenForMe = hiddenTaskIds ? hiddenTaskIds.has(t.id) : false;
        return isOpen && (max == null || approved < max) && !isHiddenForMe;
      }).slice(0, limit);
    }

    const normalized = (filterAvailable ? filtered : tasks).map(t => {
      const max = t.max_participants == null ? null : Number(t.max_participants);
      const approved = Number(t.current_participants || 0);
      let tStatus = (t.status || '').toLowerCase();
      if (max != null) {
        if (approved >= max) tStatus = 'closed';
        else if (tStatus === 'completed') tStatus = 'open';
      }
      const shaped = { ...t, status: tStatus };
      return { ...mapTask(shaped, req.user.role), approved_count: approved };
    });

    res.json(normalized);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID (numeric)
router.get('/:id(\\d+)', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM tasks WHERE id = $1', [Number(id)]);
    const taskRaw = result.rows[0];

    if (!taskRaw) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const approved = Number(taskRaw.current_participants || 0);
    const max = taskRaw.max_participants == null ? null : Number(taskRaw.max_participants);
    let status = (taskRaw.status || '').toLowerCase();
    if (max != null) {
      if (approved >= max) status = 'closed';
      else if (status === 'completed') status = 'open';
    }
    const shaped = { ...taskRaw, status, approved_count: approved };
    res.json(mapTask(shaped, req.user.role));
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task (Admin/Faculty only)
router.post('/', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const taskData = req.body;

    const taskDate = taskData.task_date || taskData.taskDate || null;
    const startTime = taskData.start_time || taskData.startTime || null;
    const endTime = taskData.end_time || taskData.endTime || null;

    const insertSql = `
      INSERT INTO tasks (title, description, location, hours_offered, max_participants, current_participants, task_date, start_time, end_time, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await db.query(insertSql, [
      taskData.title,
      taskData.description || '',
      taskData.location || null,
      Number(taskData.hours_offered ?? taskData.hoursOffered ?? taskData.hoursValue),
      taskData.max_participants ?? taskData.maxParticipants ?? null,
      taskData.current_participants ?? 0,
      taskDate ? new Date(taskDate) : null,
      startTime ? (startTime.length === 5 ? `${startTime}:00` : startTime) : null,
      endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : null,
      (taskData.status || 'open').toString().toLowerCase(),
      req.user.id
    ]);

    res.status(201).json(mapTask(result.rows[0], req.user.role));
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task (Admin/Faculty only, numeric)
router.put('/:id(\\d+)', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { id } = req.params;
    const taskData = req.body;

    const existingRes = await db.query(
      `SELECT created_by, current_participants, max_participants, status FROM tasks WHERE id = $1`,
      [Number(id)]
    );
    const existingTask = existingRes.rows[0];

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (req.user.role === 'FACULTY' && existingTask.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (taskData.title !== undefined) {
      updates.push(`title = $${paramIdx++}`);
      params.push(taskData.title);
    }
    if (taskData.description !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      params.push(taskData.description);
    }
    if (taskData.location !== undefined) {
      updates.push(`location = $${paramIdx++}`);
      params.push(taskData.location);
    }

    const hoursVal = taskData.hours_offered ?? taskData.hoursOffered;
    if (hoursVal !== undefined && Number.isFinite(Number(hoursVal)) && Number(hoursVal) > 0) {
      updates.push(`hours_offered = $${paramIdx++}`);
      params.push(Number(hoursVal));
    }

    const maxVal = taskData.max_participants ?? taskData.maxParticipants;
    if (maxVal !== undefined) {
      const nMax = Number(maxVal);
      if (Number.isFinite(nMax) && nMax >= 0) {
        const currentApproved = existingTask.current_participants || 0;
        if (nMax < currentApproved) {
          return res.status(400).json({
            error: `Max participants (${nMax}) cannot be less than currently approved participants (${currentApproved}).`
          });
        }
        updates.push(`max_participants = $${paramIdx++}`);
        params.push(nMax);
      }
    }

    if (taskData.current_participants !== undefined && Number.isFinite(Number(taskData.current_participants))) {
      updates.push(`current_participants = $${paramIdx++}`);
      params.push(Number(taskData.current_participants));
    }

    const taskDate = taskData.task_date ?? taskData.taskDate;
    if (taskDate !== undefined) {
      updates.push(`task_date = $${paramIdx++}`);
      params.push(taskDate ? new Date(taskDate) : null);
    }

    const startTime = taskData.start_time ?? taskData.startTime;
    if (startTime !== undefined) {
      updates.push(`start_time = $${paramIdx++}`);
      params.push(startTime ? (startTime.length === 5 ? `${startTime}:00` : startTime) : null);
    }

    const endTime = taskData.end_time ?? taskData.endTime;
    if (endTime !== undefined) {
      updates.push(`end_time = $${paramIdx++}`);
      params.push(endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : null);
    }

    if (taskData.status !== undefined) {
      const st = taskData.status.toString().toLowerCase();
      if (['open', 'in_progress', 'completed', 'cancelled'].includes(st)) {
        updates.push(`status = $${paramIdx++}`);
        params.push(st);
      }
    }

    if (updates.length === 0) {
      return res.json(mapTask(existingTask, req.user.role));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(Number(id));

    const updateSql = `
      UPDATE tasks 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIdx} 
      RETURNING *
    `;

    const result = await db.query(updateSql, params);
    res.json(mapTask(result.rows[0], req.user.role));
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: error.message || 'Failed to update task' });
  }
});

// Update task status (Admin/Faculty only, numeric)
router.patch('/:id(\\d+)/status', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const st = (status || '').toString().toLowerCase();
    if (!['open', 'in_progress', 'completed', 'cancelled'].includes(st)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existingRes = await db.query('SELECT created_by FROM tasks WHERE id = $1', [Number(id)]);
    const existingTask = existingRes.rows[0];

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (req.user.role === 'FACULTY' && existingTask.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [st, Number(id)]
    );

    res.json(mapTask(result.rows[0], req.user.role));
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// Delete task (Admin/Faculty only, numeric)
router.delete('/:id(\\d+)', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { id } = req.params;

    const existingRes = await db.query('SELECT created_by FROM tasks WHERE id = $1', [Number(id)]);
    const existingTask = existingRes.rows[0];

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (req.user.role === 'FACULTY' && existingTask.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query('DELETE FROM tasks WHERE id = $1', [Number(id)]);
    return res.status(204).send();
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// --- Application Endpoints ---

// Get my applications (Student)
router.get('/my-applications', authenticateToken, async (req, res) => {
  try {
    if ((req.user.role || '').toUpperCase() !== 'STUDENT') {
      return res.status(403).json({ error: 'Students only' });
    }

    const result = await db.query(
      `SELECT 
         ta.id, ta.task_id, ta.status, ta.hours_rendered, ta.updated_at,
         t.title, t.description, t.hours_offered, t.location, t.task_date
       FROM task_applications ta
       LEFT JOIN tasks t ON ta.task_id = t.id
       WHERE ta.user_id = $1
       ORDER BY ta.applied_at DESC`,
      [req.user.id]
    );

    const list = result.rows.map(a => ({
      id: a.id,
      task_id: a.task_id,
      status: (a.status || '').toLowerCase(),
      hours_rendered: a.hours_rendered || 0,
      updated_at: a.updated_at || null,
      title: a.title || '',
      description: a.description || '',
      hours_offered: a.hours_offered || 0,
      location: a.location || '',
      task_date: a.task_date || null
    }));

    res.json(list);
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get applications (Admin/Faculty)
router.get('/applications', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
         ta.id, ta.status, ta.hours_rendered,
         t.id AS task_id, t.title, t.hours_offered,
         u.id AS user_id, u.first_name, u.last_name, u.student_id
       FROM task_applications ta
       JOIN tasks t ON ta.task_id = t.id
       JOIN users u ON ta.user_id = u.id
       WHERE t.created_by = $1
       ORDER BY ta.applied_at DESC`,
      [req.user.id]
    );

    const list = result.rows.map(a => ({
      id: a.id,
      status: (a.status || '').toLowerCase(),
      hours_rendered: a.hours_rendered || 0,
      title: a.title || '',
      hours_offered: a.hours_offered || 0,
      first_name: a.first_name || '',
      last_name: a.last_name || '',
      student_id: a.student_id || ''
    }));

    res.json(list);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Apply for a task (Student)
router.post('/:taskId/apply', authenticateToken, async (req, res) => {
  try {
    if ((req.user.role || '').toUpperCase() !== 'STUDENT') {
      return res.status(403).json({ error: 'Students only' });
    }

    const taskId = Number(req.params.taskId);
    const taskRes = await db.query(
      `SELECT id, status, max_participants, current_participants FROM tasks WHERE id = $1`,
      [taskId]
    );
    const task = taskRes.rows[0];

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if ((task.status || '').toLowerCase() !== 'open') {
      return res.status(400).json({ error: 'Task is not open for applications' });
    }
    if (task.max_participants != null && (task.current_participants || 0) >= task.max_participants) {
      return res.status(400).json({ error: 'Task capacity is full' });
    }

    const existingRes = await db.query(
      `SELECT id, status FROM task_applications WHERE task_id = $1 AND user_id = $2`,
      [taskId, req.user.id]
    );
    const existing = existingRes.rows[0];

    if (existing) {
      const cur = (existing.status || '').toLowerCase();
      if (cur === 'rejected') {
        await db.query(
          `UPDATE task_applications SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [existing.id]
        );
        return res.status(200).json({ id: existing.id, status: 'pending' });
      }
      return res.status(400).json({ error: 'Already applied for this task' });
    }

    const insertRes = await db.query(
      `INSERT INTO task_applications (task_id, user_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id`,
      [taskId, req.user.id]
    );

    res.status(201).json({ id: insertRes.rows[0].id });
  } catch (error) {
    console.error('Apply for task error:', error);
    res.status(500).json({ error: 'Failed to apply for task' });
  }
});

// Withdraw application (Student)
router.delete('/applications/:applicationId', authenticateToken, async (req, res) => {
  try {
    const appId = Number(req.params.applicationId);
    const appRes = await db.query(
      `SELECT id, user_id, status FROM task_applications WHERE id = $1`,
      [appId]
    );
    const app = appRes.rows[0];

    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if ((app.status || '').toLowerCase() !== 'pending') {
      return res.status(400).json({ error: 'Only pending applications can be withdrawn' });
    }

    await db.query('DELETE FROM task_applications WHERE id = $1', [appId]);
    res.status(204).send();
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});

// Update application status (Admin/Faculty)
router.put('/applications/:applicationId', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  const client = await db.getClient();
  try {
    const appId = Number(req.params.applicationId);
    const { status, hoursRendered, remarks } = req.body || {};
    const newStatus = (status || '').toLowerCase();

    if (!['approved', 'rejected', 'completed'].includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const subRes = await client.query(
      `SELECT 
         ta.id, ta.status, ta.user_id, ta.task_id,
         t.created_by, t.hours_offered, t.max_participants, t.current_participants, t.status AS task_status
       FROM task_applications ta
       JOIN tasks t ON ta.task_id = t.id
       WHERE ta.id = $1`,
      [appId]
    );
    const submission = subRes.rows[0];

    if (!submission) return res.status(404).json({ error: 'Application not found' });
    if (submission.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE task_applications 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [newStatus, appId]
    );
    const updated = updateRes.rows[0];

    let hoursRecorded = 0;
    if (newStatus === 'approved') {
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

    if (newStatus === 'completed') {
      const hours = typeof hoursRendered === 'number' ? hoursRendered : (submission.hours_offered || 0);
      hoursRecorded = hours;
      await client.query(
        `INSERT INTO service_hours (user_id, hours, type, source_id, source_type, description, recorded_by)
         VALUES ($1, $2, 'task', $3, 'task', $4, $5)`,
        [submission.user_id, hours, submission.task_id, remarks || 'Task completed', req.user.id]
      );
    }

    await client.query('COMMIT');

    res.json({ id: updated.id, status: updated.status, hours_rendered: hoursRecorded });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update application status error:', error);
    res.status(500).json({ error: error.message || 'Failed to update application' });
  } finally {
    client.release();
  }
});

module.exports = router;
