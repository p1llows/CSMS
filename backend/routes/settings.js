const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const ensureSettingsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const splitName = (fullName) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  const last = parts.pop();
  return { first: parts.join(' '), last };
};

const updateMeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Valid email is required').max(255),
});

const updatePasswordSchema = z.object({
  current: z.string().min(1, 'Current password is required'),
  next: z.string().min(8, 'New password must be at least 8 characters').max(100),
});

const academicYearSchema = z.object({
  year: z.string().trim().min(1, 'Academic year is required').max(50),
  term: z.string().trim().max(50).optional(),
  start_date: z.string().trim().optional(),
  end_date: z.string().trim().optional(),
});

// GET /api/me
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// PUT /api/me
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid profile data' });
    }

    const { name, email } = parsed.data;
    const { first, last } = splitName(name);

    const existing = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
      [email, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already in use' });
    }

    const result = await db.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, email = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, student_id, first_name, last_name, email, role, section`,
      [first, last, email, req.user.id]
    );

    const u = result.rows[0];
    res.json({
      id: u.id,
      schoolId: u.student_id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim(),
      email: u.email,
      role: (u.role || '').toUpperCase(),
      yearSection: u.section || null,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/me/password
router.put('/me/password', authenticateToken, async (req, res) => {
  try {
    const parsed = updatePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid password data' });
    }

    const { current, next } = parsed.data;
    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const row = userRes.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(current, row.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const nextHash = await bcrypt.hash(next, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [nextHash, req.user.id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// GET /api/settings/academic-year
router.get('/settings/academic-year', authenticateToken, async (req, res) => {
  try {
    await ensureSettingsTable();
    const result = await db.query(
      "SELECT value FROM system_settings WHERE key = 'academic_year'"
    );
    res.json(result.rows[0]?.value || { year: '', term: '', start_date: '', end_date: '' });
  } catch (error) {
    console.error('Get academic year error:', error);
    res.status(500).json({ error: 'Failed to fetch academic year settings' });
  }
});

// PUT /api/settings/academic-year
router.put('/settings/academic-year', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const parsed = academicYearSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid academic year data' });
    }

    await ensureSettingsTable();
    const value = {
      year: parsed.data.year,
      term: parsed.data.term || '',
      start_date: parsed.data.start_date || '',
      end_date: parsed.data.end_date || '',
    };

    await db.query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ('academic_year', $1::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(value)]
    );

    res.json(value);
  } catch (error) {
    console.error('Save academic year error:', error);
    res.status(500).json({ error: 'Failed to save academic year settings' });
  }
});

module.exports = router;
