const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ').trim();

// GET /api/dashboard - role-aware dashboard payload
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Upcoming events
    const upcomingEventsRes = await db.query(`
      SELECT id, name, type, event_date, start_time
      FROM events
      WHERE event_date >= CURRENT_DATE
      ORDER BY event_date ASC, start_time ASC
      LIMIT 10
    `);
    const upcomingEvents = upcomingEventsRes.rows;

    if (user.role === 'ADMIN' || user.role === 'FACULTY') {
      const [
        totalStudentsRes,
        recentTasksRes,
        lastEventRes,
        totalEventsRes,
        presentCountAllRes,
        renderedAggRes,
        penaltyAggRes,
        studentsRes,
        eventsForPenaltyRes
      ] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS count FROM users WHERE LOWER(role) = 'student'`),
        db.query(`
          SELECT t.id, t.title, t.hours_offered, t.status, t.created_at, t.max_participants, t.current_participants,
                 u.first_name, u.last_name
          FROM tasks t
          LEFT JOIN users u ON t.created_by = u.id
          ORDER BY t.created_at DESC
          LIMIT 10
        `),
        db.query(`
          SELECT e.id, e.name, e.type, e.event_date,
                 COUNT(CASE WHEN LOWER(a.status) = 'present' THEN 1 END)::int AS present_count
          FROM events e
          LEFT JOIN attendance a ON e.id = a.event_id
          WHERE e.event_date <= CURRENT_DATE
          GROUP BY e.id, e.name, e.type, e.event_date, e.start_time
          ORDER BY e.event_date DESC, e.start_time DESC
          LIMIT 1
        `),
        db.query(`SELECT COUNT(*)::int AS count FROM events`),
        db.query(`
          SELECT COUNT(*)::int AS count
          FROM attendance a
          JOIN users u ON a.user_id = u.id
          WHERE LOWER(a.status) = 'present' AND LOWER(u.role) = 'student'
        `),
        db.query(`SELECT COALESCE(SUM(hours), 0)::int AS total FROM service_hours WHERE LOWER(type) = 'task'`),
        db.query(`SELECT COALESCE(SUM(hours), 0)::int AS total FROM service_hours WHERE LOWER(type) = 'penalty'`),
        db.query(`SELECT id FROM users WHERE LOWER(role) = 'student'`),
        db.query(`
          SELECT e.id, e.penalty_hours, ARRAY_AGG(a.user_id) FILTER (WHERE a.user_id IS NOT NULL) AS present_user_ids
          FROM events e
          LEFT JOIN attendance a ON e.id = a.event_id AND LOWER(a.status) = 'present'
          WHERE e.penalty_hours > 0 AND e.event_date <= CURRENT_DATE
          GROUP BY e.id, e.penalty_hours
        `)
      ]);

      const totalStudents = totalStudentsRes.rows[0]?.count || 0;
      const totalEvents = totalEventsRes.rows[0]?.count || 0;
      const presentCountAll = presentCountAllRes.rows[0]?.count || 0;
      const totalHoursRendered = renderedAggRes.rows[0]?.total || 0;
      const totalPenalty = penaltyAggRes.rows[0]?.total || 0;

      const recentTasks = recentTasksRes.rows.map(t => {
        const approved = Number(t.current_participants || 0);
        const max = t.max_participants == null ? null : Number(t.max_participants);
        let status = (t.status || '').toString().toLowerCase();
        if (max != null) {
          if (approved >= max) status = 'closed';
          else if (status === 'completed') status = 'open';
        }
        return {
          id: t.id,
          title: t.title,
          hours_offered: t.hours_offered,
          status,
          created_by_name: (t.first_name || t.last_name) ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : 'Unknown'
        };
      });

      const overallAttendanceRate = (totalEvents > 0 && totalStudents > 0)
        ? Math.round((presentCountAll / (totalEvents * totalStudents)) * 100)
        : 0;

      const lastEvent = lastEventRes.rows[0] || null;
      const presentLast = lastEvent ? lastEvent.present_count : 0;
      const attendanceStats = lastEvent ? {
        lastEventName: lastEvent.name,
        lastEventType: lastEvent.type,
        lastEventDate: lastEvent.event_date,
        present: presentLast,
        absent: Math.max(0, totalStudents - presentLast),
        attendanceRate: totalStudents > 0 ? Math.round((presentLast / totalStudents) * 100) : 0,
        overallAttendanceRate
      } : {
        lastEventName: null,
        lastEventType: null,
        lastEventDate: null,
        present: 0,
        absent: 0,
        attendanceRate: overallAttendanceRate,
        overallAttendanceRate
      };

      // Highest penalty calculation
      let highestPenaltyUserName = null;
      let highestPenaltyHours = 0;
      const students = studentsRes.rows;
      const eventsForPenalty = eventsForPenaltyRes.rows;

      if (students.length > 0 && eventsForPenalty.length > 0) {
        const penaltiesByUser = new Map(students.map(s => [s.id, 0]));
        for (const ev of eventsForPenalty) {
          const ph = ev.penalty_hours || 0;
          if (!ph || ph <= 0) continue;
          const presentSet = new Set(ev.present_user_ids || []);
          for (const s of students) {
            if (!presentSet.has(s.id)) {
              penaltiesByUser.set(s.id, (penaltiesByUser.get(s.id) || 0) + ph);
            }
          }
        }

        let maxUserId = null;
        for (const [uid, hours] of penaltiesByUser.entries()) {
          if (hours > highestPenaltyHours) {
            highestPenaltyHours = hours;
            maxUserId = uid;
          }
        }

        if (maxUserId != null) {
          const topUserRes = await db.query(
            'SELECT first_name, last_name FROM users WHERE id = $1',
            [maxUserId]
          );
          if (topUserRes.rows[0]) {
            highestPenaltyUserName = fullName(topUserRes.rows[0]);
          }
        }
      }

      const serviceHoursStats = {
        totalHoursRendered,
        totalPenalty,
        highestPenalty: highestPenaltyHours,
        highestPenaltyUserName,
      };

      const attendanceSeriesRes = await db.query(`
        SELECT e.id, e.name, e.type, e.event_date,
               COUNT(CASE WHEN LOWER(a.status) = 'present' AND LOWER(u.role) = 'student' THEN 1 END)::int AS present_count
        FROM events e
        LEFT JOIN attendance a ON e.id = a.event_id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE e.event_date <= CURRENT_DATE
        GROUP BY e.id, e.name, e.type, e.event_date, e.start_time
        ORDER BY e.event_date ASC, e.start_time ASC
      `);

      const attendanceSeries = attendanceSeriesRes.rows.map(ev => ({
        id: ev.id,
        name: ev.name,
        type: ev.type,
        event_date: ev.event_date,
        present: ev.present_count,
        absent: Math.max(0, totalStudents - ev.present_count),
      }));

      return res.json({
        totalStudents,
        totalEvents,
        upcomingEvents,
        recentTasks,
        attendanceStats,
        attendanceSeries,
        serviceHoursStats,
      });
    }

    // Student dashboard
    const userId = user.id;

    const [availableTasksRes, recentAttendanceRes, renderedRes, penaltyRes] = await Promise.all([
      db.query(`
        SELECT t.id, t.title, t.hours_offered, t.max_participants, t.current_participants
        FROM tasks t
        WHERE LOWER(t.status) = 'open'
          AND (t.max_participants IS NULL OR COALESCE(t.current_participants, 0) < t.max_participants)
          AND t.id NOT IN (
            SELECT task_id FROM task_applications WHERE user_id = $1 AND LOWER(status) != 'rejected'
          )
        ORDER BY t.created_at DESC
        LIMIT 10
      `, [userId]),
      db.query(`
        SELECT a.id, a.status, e.name AS event_name, e.type, e.event_date
        FROM attendance a
        JOIN events e ON a.event_id = e.id
        WHERE a.user_id = $1
        ORDER BY a.recorded_at DESC
        LIMIT 5
      `, [userId]),
      db.query(`
        SELECT COALESCE(SUM(sh.hours), 0)::int AS total
        FROM service_hours sh
        JOIN tasks t ON sh.source_id = t.id
        WHERE sh.user_id = $1 AND LOWER(sh.type) = 'task' AND LOWER(sh.source_type) = 'task'
      `, [userId]),
      db.query(`
        SELECT COALESCE(SUM(e.penalty_hours), 0)::int AS total
        FROM events e
        WHERE e.penalty_hours > 0
          AND e.event_date <= CURRENT_DATE
          AND e.id NOT IN (
            SELECT event_id FROM attendance WHERE user_id = $1 AND LOWER(status) = 'present'
          )
      `, [userId])
    ]);

    const availableTasks = availableTasksRes.rows;
    const recentAttendance = recentAttendanceRes.rows.map(r => ({
      id: r.id,
      status: (r.status || '').toLowerCase(),
      event_name: r.event_name || 'Unknown',
      type: r.type || '',
      event_date: r.event_date || null
    }));

    const attendanceSummary = {
      totalAbsents: recentAttendance.filter(r => r.status === 'absent').length,
      totalEvents: recentAttendance.length,
      attendanceRate: recentAttendance.length > 0
        ? Math.round((recentAttendance.filter(r => r.status === 'present').length / recentAttendance.length) * 100)
        : 0
    };

    const serviceHours = {
      rendered: renderedRes.rows[0]?.total || 0,
      penalty: penaltyRes.rows[0]?.total || 0
    };

    return res.json({
      serviceHours,
      upcomingEvents,
      availableTasks,
      recentAttendance,
      attendanceSummary,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
