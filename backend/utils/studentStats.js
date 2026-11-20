const db = require('../config/database');

/**
 * Calculate student statistics based on existing schema
 * - Missed events from attendance.status = 'absent'
 * - Required hours = missed events * 10
 * - Rendered hours from service_hours.type = 'task'
 *
 * NOTE: There is no dedicated studentStats table in the current schema.
 * This function returns a computed object without persisting.
 */
async function calculateStudentStats(studentId) {
  const uid = parseInt(studentId, 10);

  const [missedRes, renderedRes, penaltyRes] = await Promise.all([
    db.query(
      "SELECT COUNT(*)::int AS count FROM attendance WHERE user_id = $1 AND LOWER(status) = 'absent'",
      [uid]
    ),
    db.query(
      "SELECT COALESCE(SUM(hours), 0)::int AS total FROM service_hours WHERE user_id = $1 AND LOWER(type) = 'task'",
      [uid]
    ),
    db.query(
      "SELECT COALESCE(SUM(hours), 0)::int AS total FROM service_hours WHERE user_id = $1 AND LOWER(type) = 'penalty'",
      [uid]
    )
  ]);

  const missedEventsCount = missedRes.rows[0]?.count || 0;
  const totalRenderedHours = renderedRes.rows[0]?.total || 0;
  const totalPenaltyHours = penaltyRes.rows[0]?.total || 0;
  const totalRequiredHours = missedEventsCount * 10;
  const balanceHours = Math.max(totalRequiredHours - totalRenderedHours, 0);

  return {
    student_id: uid,
    totalMissedEvents: missedEventsCount,
    totalRequiredHours,
    totalRenderedHours,
    totalPenaltyHours,
    balanceHours,
    lastCalculatedAt: new Date()
  };
}

/**
 * Recalculate stats for all students
 * @returns {Promise<number>} Number of students updated
 */
async function recalculateAllStudentStats() {
  const res = await db.query("SELECT id FROM users WHERE LOWER(role) = 'student'");
  let count = 0;
  for (const s of res.rows) {
    await calculateStudentStats(s.id);
    count++;
  }
  return count;
}

/**
 * Get student stats with user info
 * @param {string|number} studentId - The student's ID
 * @returns {Promise<Object>} Student stats with user info
 */
async function getStudentStatsWithUser(studentId) {
  const uid = parseInt(studentId, 10);
  const [userRes, stats] = await Promise.all([
    db.query(
      'SELECT id, student_id, first_name, last_name, email, section FROM users WHERE id = $1',
      [uid]
    ),
    calculateStudentStats(uid)
  ]);

  const user = userRes.rows[0];
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  return {
    ...stats,
    student: {
      id: user?.id || uid,
      schoolId: user?.student_id || null,
      name,
      email: user?.email || null,
      department: null,
      yearSection: user?.section || null
    }
  };
}

module.exports = {
  calculateStudentStats,
  recalculateAllStudentStats,
  getStudentStatsWithUser
};
