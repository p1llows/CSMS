const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { loginSchema, userCreateSchema } = require('../utils/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await db.query(
      `SELECT id, student_id, first_name, last_name, email, role, year_level, section, password_hash
       FROM users
       WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('Login error: JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server misconfiguration: JWT secret missing' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Map to frontend-expected shape while hiding password
    const mappedUser = {
      id: user.id,
      schoolId: user.student_id,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ').trim(),
      email: user.email,
      role: (user.role || '').toUpperCase(),
      department: null,
      yearSection: user.section || null,
    };

    res.json({ token, user: mappedUser });
  } catch (error) {
    console.error('Login error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register (Admin only)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can register users' });
    }

    const input = userCreateSchema.parse(req.body);

    // Check if user already exists by email or student_id
    const existing = await db.query(
      `SELECT id FROM users 
       WHERE email = $1 OR (student_id = $2 AND student_id IS NOT NULL)`,
      [input.email, input.student_id || null]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email or school ID already exists' });
    }

    const password_hash = await bcrypt.hash(input.password, 12);

    const insertResult = await db.query(
      `INSERT INTO users (student_id, first_name, last_name, email, role, section, year_level, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, student_id, first_name, last_name, email, role, section, created_at`,
      [
        input.student_id || null,
        input.first_name,
        input.last_name,
        input.email,
        input.role.toLowerCase(),
        input.section || null,
        input.year_level ?? null,
        password_hash
      ]
    );

    const created = insertResult.rows[0];

    const mappedUser = {
      id: created.id,
      schoolId: created.student_id,
      name: [created.first_name, created.last_name].filter(Boolean).join(' ').trim(),
      email: created.email,
      role: (created.role || '').toUpperCase(),
      department: null,
      yearSection: created.section || null,
      createdAt: created.created_at
    };

    res.status(201).json({ user: mappedUser });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Profile alias for frontend compatibility
router.get('/profile', authenticateToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;
