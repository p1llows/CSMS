const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdminOrFaculty } = require('../middleware/auth');
const { dateRangeSchema } = require('../utils/validation');

const router = express.Router();

// Get overview analytics
router.get('/overview', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  try {
    dateRangeSchema.parse(req.query);

    // 1. Fetch events and their attendance records
    const [eventsRes, attendanceRes, renderedRes, penaltyRes, studentCountRes, topAbsencesRes] = await Promise.all([
      db.query(`SELECT id, name, type, event_date, penalty_hours FROM events ORDER BY event_date DESC`),
      db.query(`SELECT event_id, user_id, status FROM attendance`),
      db.query(`SELECT COALESCE(SUM(hours), 0)::int AS total FROM service_hours WHERE LOWER(type) = 'task'`),
      db.query(`SELECT COALESCE(SUM(hours), 0)::int AS total FROM service_hours WHERE LOWER(type) = 'penalty'`),
      db.query(`SELECT COUNT(*)::int AS count FROM users WHERE LOWER(role) = 'student'`),
      db.query(`
        SELECT a.event_id, COUNT(*)::int AS absent_count, e.name, e.type, e.event_date
        FROM attendance a
        LEFT JOIN events e ON a.event_id = e.id
        WHERE LOWER(a.status) = 'absent'
        GROUP BY a.event_id, e.name, e.type, e.event_date
        ORDER BY absent_count DESC
        LIMIT 5
      `)
    ]);

    const events = eventsRes.rows;
    const allAttendance = attendanceRes.rows;
    const studentCount = studentCountRes.rows[0]?.count || 0;
    const totalHoursRendered = renderedRes.rows[0]?.total || 0;
    const totalPenaltyHours = penaltyRes.rows[0]?.total || 0;

    // Group attendance by event_id
    const attendanceByEvent = new Map();
    for (const att of allAttendance) {
      if (!attendanceByEvent.has(att.event_id)) {
        attendanceByEvent.set(att.event_id, []);
      }
      attendanceByEvent.get(att.event_id).push(att);
    }

    const attendanceRateByEvent = events.map(ev => {
      const records = attendanceByEvent.get(ev.id) || [];
      const total = records.length;
      const present = records.filter(a => (a.status || '').toLowerCase() === 'present').length;
      const absent = total - present;
      return {
        event_id: ev.id,
        name: ev.name,
        type: ev.type,
        event_date: ev.event_date,
        total_records: total,
        present,
        absent,
        attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0
      };
    });

    const eventIds = events.map(e => e.id);
    const totalEventsCount = events.length;

    // Overall attendance calculation
    let presentCountAll = 0;
    if (eventIds.length > 0) {
      const presentRes = await db.query(`
        SELECT COUNT(*)::int AS count
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE LOWER(a.status) = 'present' AND LOWER(u.role) = 'student'
      `);
      presentCountAll = presentRes.rows[0]?.count || 0;
    }

    const overallAttendanceRate = (totalEventsCount > 0 && studentCount > 0)
      ? Math.round((presentCountAll / (totalEventsCount * studentCount)) * 100)
      : 0;

    // 1) Student Engagement Rate
    let engagementRate = 0;
    if (eventIds.length > 0 && studentCount > 0) {
      const engagedRes = await db.query(`
        SELECT COUNT(DISTINCT a.user_id)::int AS count
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE LOWER(a.status) = 'present' AND LOWER(u.role) = 'student'
      `);
      engagementRate = Math.round(((engagedRes.rows[0]?.count || 0) / studentCount) * 100);
    }

    // 2) FRC Compliance Rate
    const frcEventIds = events.filter(e => (e.type || '').toString().toUpperCase() === 'FRC').map(e => e.id);
    let frcComplianceRate = 0;
    if (frcEventIds.length > 0 && studentCount > 0) {
      const frcPresentRes = await db.query(`
        SELECT COUNT(*)::int AS count
        FROM attendance a
        JOIN events e ON a.event_id = e.id
        JOIN users u ON a.user_id = u.id
        WHERE LOWER(a.status) = 'present' AND UPPER(e.type) = 'FRC' AND LOWER(u.role) = 'student'
      `);
      frcComplianceRate = Math.round(((frcPresentRes.rows[0]?.count || 0) / (frcEventIds.length * studentCount)) * 100);
    }

    // 3) Task Fulfillment Rate
    const tasksRes = await db.query(`
      SELECT id, max_participants, current_participants 
      FROM tasks 
      WHERE max_participants IS NOT NULL
    `);
    const tasksInPeriod = tasksRes.rows;
    const denominator = tasksInPeriod.length;
    const fulfilled = tasksInPeriod.reduce((acc, t) => {
      const max = Number(t.max_participants || 0);
      const curr = Number(t.current_participants || 0);
      return acc + (max > 0 && curr >= max ? 1 : 0);
    }, 0);
    const taskFulfillmentRate = denominator > 0 ? Math.round((fulfilled / denominator) * 100) : 0;

    // 4) Students With Penalty
    let penaltyStudentsCount = 0;
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const penalizedEvents = events.filter(e => Number(e.penalty_hours || 0) > 0 && new Date(e.event_date) <= todayEnd);
    if (penalizedEvents.length > 0) {
      const studentsRes = await db.query(`SELECT id FROM users WHERE LOWER(role) = 'student'`);
      const students = studentsRes.rows;
      const penalizedSet = new Set();
      for (const ev of penalizedEvents) {
        const records = attendanceByEvent.get(ev.id) || [];
        const presentSet = new Set(records.filter(a => (a.status || '').toLowerCase() === 'present').map(a => a.user_id));
        for (const s of students) {
          if (!presentSet.has(s.id)) {
            penalizedSet.add(s.id);
          }
        }
      }
      penaltyStudentsCount = penalizedSet.size;
    }

    const topAbsenceEvents = topAbsencesRes.rows.map(a => ({
      event_id: a.event_id,
      name: a.name || 'Unknown',
      type: a.type || '',
      event_date: a.event_date || null,
      absent_count: a.absent_count
    }));

    // Attendance trends by event_date
    const attendanceTrendsMap = new Map();
    for (const ev of events) {
      const key = new Date(ev.event_date).toISOString().slice(0, 10);
      const records = attendanceByEvent.get(ev.id) || [];
      const present = records.filter(a => (a.status || '').toLowerCase() === 'present').length;
      const entry = attendanceTrendsMap.get(key) || { date: new Date(ev.event_date), present_count: 0, total_expected: 0 };
      entry.present_count += present;
      entry.total_expected += studentCount;
      attendanceTrendsMap.set(key, entry);
    }
    const attendanceTrends = Array.from(attendanceTrendsMap.values()).sort((a, b) => a.date - b.date);

    // Service hours trends
    const serviceHoursRes = await db.query(`SELECT recorded_at, hours, type FROM service_hours`);
    const shTrendsMap = new Map();
    for (const row of serviceHoursRes.rows) {
      const key = (row.recorded_at ? new Date(row.recorded_at) : new Date()).toISOString().slice(0, 10);
      const entry = shTrendsMap.get(key) || { date: new Date(row.recorded_at || new Date()), hours_rendered: 0, penalty_hours: 0 };
      if ((row.type || '').toLowerCase() === 'task') entry.hours_rendered += row.hours || 0;
      shTrendsMap.set(key, entry);
    }
    for (const ev of events) {
      const ph = Number(ev.penalty_hours || 0);
      if (!ph || ph <= 0) continue;
      const records = attendanceByEvent.get(ev.id) || [];
      const present = records.filter(a => (a.status || '').toLowerCase() === 'present').length;
      const absentCount = Math.max(0, studentCount - present);
      if (absentCount <= 0) continue;
      const key = new Date(ev.event_date).toISOString().slice(0, 10);
      const entry = shTrendsMap.get(key) || { date: new Date(ev.event_date), hours_rendered: 0, penalty_hours: 0 };
      entry.penalty_hours += absentCount * ph;
      shTrendsMap.set(key, entry);
    }
    const serviceHoursTrends = Array.from(shTrendsMap.values()).sort((a, b) => a.date - b.date);

    // Event types distribution
    const eventTypeCounts = events.reduce((acc, ev) => {
      const t = ev.type || 'Unknown';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    const eventTypes = Object.entries(eventTypeCounts).map(([type, count]) => ({ type, count }));

    // Top tasks by applications and completion
    const topTasksQuery = await db.query(`
      SELECT 
        t.id, t.title, t.hours_offered,
        COUNT(ta.id)::int AS application_count,
        COUNT(CASE WHEN LOWER(ta.status) = 'completed' THEN 1 END)::int AS completed_count
      FROM tasks t
      LEFT JOIN task_applications ta ON t.id = ta.task_id
      GROUP BY t.id, t.title, t.hours_offered
      ORDER BY application_count DESC
      LIMIT 5
    `);

    const topTasks = topTasksQuery.rows.map(t => {
      const apps = t.application_count || 0;
      const comp = t.completed_count || 0;
      return {
        id: t.id,
        title: t.title,
        hours_offered: t.hours_offered,
        application_count: apps,
        completion_rate: apps > 0 ? (comp / apps) * 100 : 0
      };
    });

    res.json({
      attendanceRateByEvent,
      summary: {
        totalStudents: studentCount,
        totalHoursRendered,
        totalPenaltyHours
      },
      overallAttendanceRate,
      engagementRate,
      frcComplianceRate,
      taskFulfillmentRate,
      penaltyStudentsCount,
      topAbsenceEvents,
      attendanceTrends,
      serviceHoursTrends,
      eventTypes,
      topTasks
    });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/departments', authenticateToken, async (req, res) => {
  return res.status(501).json({ error: 'Department analytics not supported' });
});

router.get('/tasks', authenticateToken, requireAdminOrFaculty, async (req, res) => {
  return res.status(501).json({ error: 'Task analytics not supported' });
});

module.exports = router;
