const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrFaculty } = require('../middleware/auth');
const { paginationSchema, dateRangeSchema } = require('../utils/validation');

const router = express.Router();

// Helper to map DB event -> frontend expected shape
function mapEvent(e) {
  const toHHMM = (d) => {
    if (!d) return null;
    if (typeof d === 'string') {
      const match = d.match(/^(\d{2}:\d{2})/);
      if (match) return match[1];
    }
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d).slice(0, 5);
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  return {
    id: e.id,
    name: e.name,
    type: e.type,
    event_date: e.event_date instanceof Date ? e.event_date.toISOString().split('T')[0] : e.event_date,
    start_time: toHHMM(e.start_time),
    end_time: toHHMM(e.end_time),
    location: e.location || '',
    description: e.description || '',
    penalty_hours: e.penalty_hours ?? 0,
    is_mandatory: e.is_mandatory ?? true
  };
}

// Get events
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { from, to } = dateRangeSchema.parse(req.query);
    const { type, search } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (type) {
      conditions.push(`type = $${paramIdx++}`);
      params.push(type);
    }

    if (from) {
      conditions.push(`event_date >= $${paramIdx++}`);
      params.push(new Date(from));
    }

    if (to) {
      conditions.push(`event_date <= $${paramIdx++}`);
      params.push(new Date(to));
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIdx} OR type ILIKE $${paramIdx} OR location ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const sql = `
      SELECT * FROM events 
      ${whereClause} 
      ORDER BY event_date DESC 
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limit, offset);

    const result = await db.query(sql, params);
    res.json(result.rows.map(mapEvent));
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Delete event (Admin/Faculty)
router.delete('/:id', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await db.query('SELECT created_by FROM events WHERE id = $1', [Number(id)]);
    const existing = existingResult.rows[0];

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Faculty can delete only their own events
    if (req.user.role === 'FACULTY' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query('DELETE FROM events WHERE id = $1', [Number(id)]);
    return res.status(204).send();
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Get event by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM events WHERE id = $1', [Number(id)]);
    const event = result.rows[0];

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(mapEvent(event));
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event (Admin/Faculty)
router.post('/', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const eventData = req.body;

    const eventDate = eventData.eventDate || eventData.event_date;
    const startTime = eventData.startTime ? (eventData.startTime.length === 5 ? `${eventData.startTime}:00` : eventData.startTime) : null;
    const endTime = eventData.endTime ? (eventData.endTime.length === 5 ? `${eventData.endTime}:00` : eventData.endTime) : null;

    const insertSql = `
      INSERT INTO events (name, type, description, event_date, start_time, end_time, location, penalty_hours, is_mandatory, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await db.query(insertSql, [
      eventData.name,
      eventData.type,
      eventData.description || null,
      eventDate,
      startTime,
      endTime,
      eventData.location || null,
      eventData.penaltyHours ?? eventData.penalty_hours ?? 0,
      eventData.isMandatory ?? eventData.is_mandatory ?? true,
      req.user.id || null
    ]);

    res.status(201).json(mapEvent(result.rows[0]));
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event (Admin/Faculty)
router.put('/:id', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    const { id } = req.params;
    const eventData = req.body;

    if (req.user.role === 'FACULTY') {
      const existingResult = await db.query('SELECT created_by FROM events WHERE id = $1', [Number(id)]);
      const existing = existingResult.rows[0];
      if (!existing) {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (existing.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (eventData.name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      params.push(eventData.name);
    }
    if (eventData.type !== undefined) {
      updates.push(`type = $${paramIdx++}`);
      params.push(eventData.type);
    }
    if (eventData.description !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      params.push(eventData.description);
    }
    const eventDate = eventData.eventDate !== undefined ? eventData.eventDate : eventData.event_date;
    if (eventDate !== undefined) {
      updates.push(`event_date = $${paramIdx++}`);
      params.push(eventDate);
    }
    if (eventData.startTime !== undefined || eventData.start_time !== undefined) {
      const st = eventData.startTime !== undefined ? eventData.startTime : eventData.start_time;
      updates.push(`start_time = $${paramIdx++}`);
      params.push(st ? (st.length === 5 ? `${st}:00` : st) : null);
    }
    if (eventData.endTime !== undefined || eventData.end_time !== undefined) {
      const et = eventData.endTime !== undefined ? eventData.endTime : eventData.end_time;
      updates.push(`end_time = $${paramIdx++}`);
      params.push(et ? (et.length === 5 ? `${et}:00` : et) : null);
    }
    if (eventData.location !== undefined) {
      updates.push(`location = $${paramIdx++}`);
      params.push(eventData.location);
    }
    const penaltyHours = eventData.penaltyHours !== undefined ? eventData.penaltyHours : eventData.penalty_hours;
    if (penaltyHours !== undefined) {
      updates.push(`penalty_hours = $${paramIdx++}`);
      params.push(penaltyHours);
    }
    const isMandatory = eventData.isMandatory !== undefined ? eventData.isMandatory : eventData.is_mandatory;
    if (isMandatory !== undefined) {
      updates.push(`is_mandatory = $${paramIdx++}`);
      params.push(isMandatory);
    }

    if (updates.length === 0) {
      const existing = await db.query('SELECT * FROM events WHERE id = $1', [Number(id)]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
      return res.json(mapEvent(existing.rows[0]));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(Number(id));

    const updateSql = `
      UPDATE events 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIdx} 
      RETURNING *
    `;

    const result = await db.query(updateSql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(mapEvent(result.rows[0]));
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Archive event (Admin only)
router.patch('/:id/archive', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM events WHERE id = $1', [Number(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(mapEvent(result.rows[0]));
  } catch (error) {
    console.error('Archive event error:', error);
    res.status(500).json({ error: 'Failed to archive event' });
  }
});

// Get event types (for filters)
router.get('/meta/types', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT type FROM events WHERE type IS NOT NULL ORDER BY type ASC');
    res.json({ types: result.rows.map(t => t.type) });
  } catch (error) {
    console.error('Get event types error:', error);
    res.status(500).json({ error: 'Failed to fetch event types' });
  }
});

module.exports = router;
