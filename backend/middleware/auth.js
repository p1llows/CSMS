const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('Auth middleware error: JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server misconfiguration: JWT secret missing' });
    }
    // Read token from cookie or Authorization: Bearer <token>
    let token = req.cookies.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring('Bearer '.length);
    }

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query(
      `SELECT id, student_id, first_name, last_name, email, role, section 
       FROM users 
       WHERE id = $1`,
      [decoded.userId]
    );

    const dbUser = result.rows[0];
    if (!dbUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Map to frontend-expected shape
    req.user = {
      id: dbUser.id,
      schoolId: dbUser.student_id,
      name: [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ').trim(),
      email: dbUser.email,
      role: (dbUser.role || '').toUpperCase(),
      department: null,
      yearSection: dbUser.section || null,
    };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const requireAdmin = requireRole(['ADMIN']);
const requireAdminOrFaculty = requireRole(['ADMIN', 'FACULTY']);
const requireStudent = requireRole(['STUDENT']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireAdminOrFaculty,
  requireStudent
};
