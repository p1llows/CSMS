import axios from 'axios';
import { Search, Download, CheckCircle, XCircle, Eye, CheckSquare, ChevronDown, ChevronRight, Clock, Check, X } from 'lucide-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAuth } from '../../context/AuthContext.jsx';

const AttendanceManagement = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [studentsError, setStudentsError] = useState(null);
  const [yearFilter, setYearFilter] = useState('all'); // 'all' | '1' | '2' | '3' | '4'
  const printRef = useRef(null);
  const onPrint = () => {
    window.print();
  };

  useEffect(() => {
    fetchAttendance();
    fetchEvents();
    // Only Admin/Faculty should fetch all students; normalize role to uppercase
    const role = (user?.role || '').toString().toUpperCase();
    if (role !== 'STUDENT') {
      fetchStudents();
    }
  }, [user]);

  const fetchAttendance = async () => {
    try {
      const params = { page: 1, limit: 1000 };
      const response = await axios.get('/api/attendance', { params });
      setAttendance(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const [expandedEventIds, setExpandedEventIds] = useState({});
  const [mobileStatusTab, setMobileStatusTab] = useState('all');
  const [eventTimelineFilter, setEventTimelineFilter] = useState('all');
  const SESSION_SLOTS = [
    { key: 'am_in', label: 'AM In' },
    { key: 'am_out', label: 'AM Out' },
    { key: 'pm_in', label: 'PM In' },
    { key: 'pm_out', label: 'PM Out' },
  ];
  const isMultiSessionEvent = (ev) => (ev?.type || '').toString().toUpperCase() !== 'FRC';
  const toggleExpandEvent = (eventId) => {
    setExpandedEventIds((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };
  const getSessionCount = (rec) => {
    if (!rec) return 0;
    return SESSION_SLOTS.reduce((acc, s) => acc + (rec[s.key] ? 1 : 0), 0);
  };

  const attendanceMap = useMemo(() => {
    const map = new Map();
    for (const rec of attendance) {
      if (rec.user_id && rec.event_id) {
        map.set(`${rec.user_id}-${rec.event_id}`, {
          status: (rec.status || '').toString().toLowerCase(),
          am_in: Boolean(rec.am_in),
          am_out: Boolean(rec.am_out),
          pm_in: Boolean(rec.pm_in),
          pm_out: Boolean(rec.pm_out),
        });
      }
    }
    return map;
  }, [attendance]);

  const fetchEvents = async () => {
    try {
      // Fetch a larger set to cover all visible events in views
      const response = await axios.get('/api/events', { params: { page: 1, limit: 1000 } });
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const isUpcomingEvent = (ev) => {
    if (!ev?.event_date) return false;
    const match = String(ev.event_date).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const evDate = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(ev.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return evDate > today;
  };

  const matchesTimelineFilter = (ev) => {
    if (eventTimelineFilter === 'held') return !isUpcomingEvent(ev);
    if (eventTimelineFilter === 'upcoming') return isUpcomingEvent(ev);
    return true;
  };

  const frcEventsSorted = useMemo(() => (
    events
      .filter(e => (e.type || '').toUpperCase() === 'FRC' && matchesTimelineFilter(e))
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  ), [events, eventTimelineFilter]);

  const otherEventsSorted = useMemo(() => (
    events
      .filter(e => (e.type || '').toUpperCase() !== 'FRC' && matchesTimelineFilter(e))
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  ), [events, eventTimelineFilter]);

  const eventsSorted = useMemo(() => ([...frcEventsSorted, ...otherEventsSorted]), [frcEventsSorted, otherEventsSorted]);
  const eventsToShow = useMemo(() => {
    if (eventTypeFilter === 'FRC') return frcEventsSorted;
    if (eventTypeFilter === 'Events') return otherEventsSorted;
    return eventsSorted;
  }, [eventTypeFilter, frcEventsSorted, otherEventsSorted, eventsSorted]);

  const computeTotalPenalty = (studentId) => {
    let total = 0;
    for (const ev of eventsToShow) {
      const key = `${studentId}-${ev.id}`;
      const recorded = attendanceMap.get(key);
      if (!recorded && isUpcomingEvent(ev)) continue;
      const status = (recorded?.status || 'absent').toLowerCase();
      if (status === 'absent') {
        const pen = Number(ev.penalty_hours || 0);
        total += isNaN(pen) ? 0 : pen;
      }
    }
    return total;
  };

  const fetchStudents = async () => {
    try {
      setStudentsError(null);
      const response = await axios.get('/api/users', { params: { role: 'STUDENT', page: 1, limit: 1000 } });
      const data = response.data;
      // Backend returns { users: [...], pagination: {...} }
      // Fallback to array if API shape differs
      const list = Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []);
      setStudents(list);
      if (!Array.isArray(list)) {
        setStudentsError('Unexpected response shape from /api/users');
      }
    } catch (error) {
      const status = error?.response?.status;
      setStudents([]);
      setStudentsError(status ? `Failed to fetch students (HTTP ${status})` : 'Failed to fetch students');
      console.error('Failed to fetch students:', error);
    }
  };

  // Name helpers: normalize and format names for display/sort/search
  // Some imported rows may have been split as: first_name = first token, last_name = rest (e.g., "Ben Harvey Galimba" -> fn: "Ben", ln: "Harvey Galimba").
  // For display, we reattach middle parts to the first name and keep the last token as the true last name.
  const normalizeNameParts = (s) => {
    const fnRaw = (s?.first_name || s?.firstName || '').toString().trim();
    const lnRaw = (s?.last_name || s?.lastName || '').toString().trim();
    if (!lnRaw) return { first: fnRaw, last: '' };
    const lnParts = lnRaw.split(/\s+/).filter(Boolean);
    if (lnParts.length > 1) {
      const last = lnParts[lnParts.length - 1];
      const middleAsFirst = lnParts.slice(0, -1).join(' ');
      const first = [fnRaw, middleAsFirst].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      return { first, last };
    }
    return { first: fnRaw, last: lnRaw };
  };

  const getDisplayName = (s) => {
    const rawName = (s?.name || '').toString().trim();
    // If backend provided name already in 'Last, First Middle' (has comma), use it directly
    if (rawName.includes(',')) {
      return rawName.replace(/\s+/g, ' ').trim();
    }
    const { first, last } = normalizeNameParts(s);
    if (!last) return (first || '').trim();
    return `${last}, ${first}`.replace(/\s+/g, ' ').trim();
  };

  const getSortKey = (s) => {
    const rawName = (s?.name || '').toString().trim();
    if (rawName.includes(',')) {
      const [lastPart, rest] = rawName.split(',');
      return `${lastPart.trim().toLowerCase()} ${(rest || '').trim().toLowerCase()}`.trim();
    }
    const { first, last } = normalizeNameParts(s);
    return `${(last || '').toLowerCase()} ${(first || '').toLowerCase()}`.trim();
  };

  const getSearchBlob = (s) => {
    const { first, last } = normalizeNameParts(s);
    return `${first} ${last} ${s?.student_id || s?.schoolId || ''}`.toLowerCase();
  };

  const compareStudents = (a, b) => {
    const secA = (a.section || '').toString().toLowerCase();
    const secB = (b.section || '').toString().toLowerCase();
    if (secA !== secB) return secA.localeCompare(secB);
    const nameA = getSortKey(a);
    const nameB = getSortKey(b);
    return nameA.localeCompare(nameB);
  };

  const groupedSections = useMemo(() => {
    const groups = new Map();
    for (const s of students) {
      const key = (s.section || 'Unassigned').toString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }
    const result = Array.from(groups.entries())
      .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(([section, list]) => ({ section, students: list.sort((x, y) => {
        const nameX = getSortKey(x);
        const nameY = getSortKey(y);
        return nameX.localeCompare(nameY);
      }) }));
    return result;
  }, [students]);

  // Group by Year Level (1-4) first, then by Section; for Admin/Faculty views
  const groupedYearSections = useMemo(() => {
    const yearMap = new Map(); // year(string) -> Map<section, students[]>
    for (const s of students) {
      const raw = (s.yearLevel ?? s.year_level ?? null);
      let yl = null;
      if (typeof raw === 'number') yl = raw;
      else if (typeof raw === 'string' && raw.trim() !== '') yl = parseInt(raw, 10);
      // Only 1-4; others go to 'Unknown'
      const yearKey = (yl && yl >= 1 && yl <= 4) ? String(yl) : 'Unknown';
      if (!yearMap.has(yearKey)) yearMap.set(yearKey, new Map());
      const sec = (s.section || s.yearSection || 'Unassigned').toString();
      const secMap = yearMap.get(yearKey);
      if (!secMap.has(sec)) secMap.set(sec, []);
      secMap.get(sec).push(s);
    }
    const order = ['1', '2', '3', '4', 'Unknown'];
    const byYear = [];
    for (const year of order) {
      if (!yearMap.has(year)) continue;
      const secMap = yearMap.get(year);
      const sections = Array.from(secMap.entries())
        .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .map(([section, list]) => ({
          section,
          students: list.sort((x, y) => {
            const nameX = getSortKey(x);
            const nameY = getSortKey(y);
            return nameX.localeCompare(nameY);
          })
        }));
      const total = Array.from(secMap.values()).reduce((acc, arr) => acc + arr.length, 0);
      byYear.push({ year, sections, total });
    }
    return byYear;
  }, [students]);

  const filteredGroupedSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return groupedSections;
    return groupedSections
      .map(({ section, students }) => ({
        section,
        students: students.filter((s) => getSearchBlob(s).includes(term))
      }))
      .filter(({ students }) => students.length > 0);
  }, [groupedSections, searchTerm]);

  // Filtered Year -> Sections -> Students (for Admin/Faculty views)
  const filteredGroupedYearSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return groupedYearSections;
    return groupedYearSections
      .map(({ year, sections, total }) => {
        const filteredSections = sections
          .map(({ section, students }) => ({
            section,
            students: students.filter((s) => getSearchBlob(s).includes(term))
          }))
          .filter(({ students }) => students.length > 0);
        const newTotal = filteredSections.reduce((acc, s) => acc + s.students.length, 0);
        return { year, sections: filteredSections, total: newTotal };
      })
      .filter(({ sections }) => sections.length > 0);
  }, [groupedYearSections, searchTerm]);

  // Compute sections based on selected year tab and search term (for Admin/Faculty)
  const sectionsForAdmin = useMemo(() => {
    const selectedYears = yearFilter === 'all'
      ? groupedYearSections
      : groupedYearSections.filter((y) => String(y.year) === String(yearFilter));

    // Flatten sections across selected years
    let sections = [];
    for (const y of selectedYears) {
      sections = sections.concat(y.sections || []);
    }
    // Sort by section name
    sections.sort((a, b) => a.section.toLowerCase().localeCompare(b.section.toLowerCase()));
    // Apply search filter to student names
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sections;
    return sections
      .map(({ section, students }) => ({
        section,
        students: students.filter((s) => getSearchBlob(s).includes(term))
      }))
      .filter(({ students }) => students.length > 0);
  }, [groupedYearSections, yearFilter, searchTerm]);

  const [collapsedSections, setCollapsedSections] = useState({});
  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const listSections = useMemo(() => {
    const role = (user?.role || '').toString().toUpperCase();
    if (role === 'STUDENT') {
      // Prefer the backend-provided name (may already be in 'Last, First Middle' format)
      const rawName = (user?.name || '').toString().trim();
      let firstName = (user?.firstName || '').toString().trim();
      let lastName = (user?.lastName || '').toString().trim();
      if (!firstName && !lastName && rawName) {
        const parts = rawName.split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
          firstName = parts[0];
          lastName = '';
        } else if (parts.length > 1) {
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
        }
      }
      const composedFallback = [firstName, lastName].filter(Boolean).join(' ').trim();
      const stu = {
        id: user.id,
        name: rawName || composedFallback,
        // Provide parsed first/last where possible to enable consistent 'Last, First' formatting
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        student_id: user.studentId || user.schoolId || '',
        section: user.section || user.yearSection || 'Unassigned',
      };
      return [{ section: stu.section, students: [stu] }];
    }
    return groupedSections;
  }, [user, groupedSections]);

  const filteredListSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return listSections;
    return listSections
      .map(({ section, students }) => ({
        section,
        students: students.filter((s) => getSearchBlob(s).includes(term))
      }))
      .filter(({ students }) => students.length > 0);
  }, [listSections, searchTerm]);

  const recordAttendance = async (eventId, userId, status) => {
    try {
      console.log('Recording attendance:', { eventId, userId, status });
      
      // Optimistic update first for immediate UI feedback
      const allFlag = status.toLowerCase() === 'present';
      setAttendance((curr) => {
        const next = [...curr];
        const idx = next.findIndex(r => r.user_id === userId && r.event_id === eventId);
        const patch = {
          status: status.toLowerCase(),
          am_in: allFlag,
          am_out: allFlag,
          pm_in: allFlag,
          pm_out: allFlag,
        };
        if (idx >= 0) {
          next[idx] = { ...next[idx], ...patch };
        } else {
          next.push({ user_id: userId, event_id: eventId, ...patch });
        }
        return next;
      });

      // Send to backend
      const response = await axios.post('/api/attendance', {
        eventId,
        userId,
        status
      });
      
      console.log('Backend call successful:', response.data);
    } catch (error) {
      console.error('Failed to record attendance:', error);
      // Revert optimistic update on error
      setAttendance((curr) => {
        const next = [...curr];
        const idx = next.findIndex(r => r.user_id === userId && r.event_id === eventId);
        if (idx >= 0) {
          const revertedStatus = status === 'present' ? 'absent' : 'present';
          next[idx] = { ...next[idx], status: revertedStatus };
        }
        return next;
      });
    }
  };

  const recordSessionAttendance = async (eventId, userId, slotKey, checked) => {
    const key = `${userId}-${eventId}`;
    const prevRec = attendanceMap.get(key) || {
      status: 'absent',
      am_in: false,
      am_out: false,
      pm_in: false,
      pm_out: false,
    };
    const nextSessions = {
      am_in: prevRec.am_in,
      am_out: prevRec.am_out,
      pm_in: prevRec.pm_in,
      pm_out: prevRec.pm_out,
      [slotKey]: checked,
    };
    const nextStatus =
      nextSessions.am_in && nextSessions.am_out && nextSessions.pm_in && nextSessions.pm_out
        ? 'present'
        : 'absent';

    setAttendance((curr) => {
      const next = [...curr];
      const idx = next.findIndex((r) => r.user_id === userId && r.event_id === eventId);
      const updated = { user_id: userId, event_id: eventId, status: nextStatus, ...nextSessions };
      if (idx >= 0) next[idx] = { ...next[idx], ...updated };
      else next.push(updated);
      return next;
    });

    try {
      await axios.post('/api/attendance', {
        eventId,
        userId,
        ...nextSessions,
      });
    } catch (error) {
      console.error('Failed to record session attendance:', error);
      setAttendance((curr) => {
        const next = [...curr];
        const idx = next.findIndex((r) => r.user_id === userId && r.event_id === eventId);
        if (idx >= 0) {
          next[idx] = { ...next[idx], ...prevRec };
        }
        return next;
      });
    }
  };

  const getStatusBadge = (status, sessionCount = null) => {
    const badges = {
      present: {
        icon: CheckCircle,
        class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        text: sessionCount !== null ? `Present · ${sessionCount}/4` : 'Present',
      },
      absent: {
        icon: XCircle,
        class: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
        text: sessionCount !== null ? `Absent · ${sessionCount}/4` : 'Absent',
      },
      upcoming: { icon: Clock, class: 'bg-muted text-muted-foreground', text: 'Upcoming' }
    };
    const badge = badges[status] || { icon: XCircle, class: 'bg-muted text-muted-foreground', text: 'Unknown' };
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.class}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const isStudentRole = (user?.role || '').toString().toUpperCase() === 'STUDENT';
  const isAdminRole = (user?.role || '').toString().toUpperCase() === 'ADMIN';
  const cardClass =
    'rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden';

  const totalEventCols = eventsToShow.reduce(
    (sum, ev) => sum + (isMultiSessionEvent(ev) && expandedEventIds[ev.id] ? 4 : 1),
    0
  );

  const renderStudentRow = (student, isMatrix) => {
    const penalty = computeTotalPenalty(student.id);
    return (
      <tr key={student.id} className="hover:bg-muted/35 transition-colors">
        <td className="sticky left-0 bg-card pl-4 pr-3 py-3 whitespace-nowrap z-10 min-w-[165px] sm:min-w-[190px] border-r border-border/60 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-none">
          <div className="text-sm font-medium text-foreground">{getDisplayName(student)}</div>
          <div className="text-xs text-muted-foreground font-mono tabular-nums">{student.student_id}</div>
        </td>
        {eventsToShow.map((event) => {
          const key = `${student.id}-${event.id}`;
          const rec = attendanceMap.get(key);
          const isMulti = isMultiSessionEvent(event);
          const isExpanded = isMulti && Boolean(expandedEventIds[event.id]);
          const isUpcoming = isUpcomingEvent(event);
          const upcomingUnrecorded = !rec && isUpcoming;
          const status = upcomingUnrecorded
            ? 'upcoming'
            : (rec?.status || 'absent').toLowerCase();

          if (isMulti && isExpanded) {
            return SESSION_SLOTS.map((slot) => {
              const slotChecked = Boolean(rec?.[slot.key]);
              if (isMatrix) {
                return (
                  <td key={`${event.id}-${slot.key}`} className="px-2 py-3 whitespace-nowrap text-center align-middle">
                    <input
                      type="checkbox"
                      disabled={isUpcoming}
                      title={isUpcoming ? 'Upcoming event — attendance cannot be marked yet' : undefined}
                      className={`w-4 h-4 accent-primary border-border rounded focus:ring-primary ${
                        isUpcoming ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      checked={slotChecked}
                      onChange={(e) => recordSessionAttendance(event.id, student.id, slot.key, e.target.checked)}
                      aria-label={`${slot.label} for ${getDisplayName(student)} in ${event.name}`}
                    />
                  </td>
                );
              }
              return (
                <td key={`${event.id}-${slot.key}`} className="px-2 py-3 whitespace-nowrap text-center align-middle">
                  {upcomingUnrecorded ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : slotChecked ? (
                    <span
                      title={`${slot.label}: Present`}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span
                      title={`${slot.label}: Missing`}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </span>
                  )}
                </td>
              );
            });
          }

          if (isMulti && !isMatrix) {
            const cnt = getSessionCount(rec);
            return (
              <td
                key={event.id}
                onClick={() => toggleExpandEvent(event.id)}
                title="Click to expand 4 sessions (AM In, AM Out, PM In, PM Out)"
                className="px-2 py-3 whitespace-nowrap text-center align-middle cursor-pointer hover:bg-muted/40 transition-colors"
              >
                {getStatusBadge(status, upcomingUnrecorded ? null : cnt)}
              </td>
            );
          }

          if (isMatrix) {
            const checked = status === 'present';
            const cnt = isMulti ? getSessionCount(rec) : null;
            return (
              <td key={event.id} className="px-3 py-3 whitespace-nowrap text-center align-middle">
                <div className="inline-flex flex-col items-center gap-0.5">
                  <input
                    type="checkbox"
                    disabled={isUpcoming}
                    title={isUpcoming ? 'Upcoming event — attendance cannot be marked yet' : undefined}
                    className={`w-4 h-4 accent-primary border-border rounded focus:ring-primary ${
                      isUpcoming ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    checked={checked}
                    onChange={(e) => recordAttendance(event.id, student.id, e.target.checked ? 'present' : 'absent')}
                    aria-label={`Toggle attendance for ${getDisplayName(student)} in ${event.name}`}
                  />
                  {isMulti && !upcomingUnrecorded && cnt > 0 && cnt < 4 && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                      {cnt}/4
                    </span>
                  )}
                </div>
              </td>
            );
          }
          return (
            <td key={event.id} className="px-2 py-3 whitespace-nowrap text-center align-middle">
              {getStatusBadge(status)}
            </td>
          );
        })}
        <td className="sticky right-0 bg-card pl-3 pr-4 py-3 whitespace-nowrap text-right align-middle w-24 z-10 border-l border-border/60 shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-none">
          <span
            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
              penalty > 0
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {penalty}h
          </span>
        </td>
      </tr>
    );
  };

  const renderSectionGroup = (year, section, students, modePrefix, isMatrix) => {
    const secKey = `${modePrefix}|${year}|${section}`;
    const isCollapsed = collapsedSections[secKey];
    return (
      <React.Fragment key={`${modePrefix}-${secKey}`}>
        <tr className="bg-card hover:bg-muted/40 transition-colors">
          <td
            className="sticky left-0 bg-card pl-4 pr-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer z-20 border-r border-border/60"
            onClick={() => toggleSection(secKey)}
          >
            <div className="inline-flex items-center gap-1.5">
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className="text-foreground font-medium">Section {section}</span>
              <span className="text-muted-foreground tabular-nums">· {students.length}</span>
            </div>
          </td>
          <td colSpan={totalEventCols} className="bg-card px-3 py-2" />
          <td className="sticky right-0 bg-card z-20 border-l border-border/60" />
        </tr>
        {!isCollapsed && students.map((student) => renderStudentRow(student, isMatrix))}
      </React.Fragment>
    );
  };

  const renderAttendanceTable = (isMatrix) => {
    const modePrefix = isMatrix ? 'tab' : 'list';
    const hasNoStudents = isStudentRole
      ? filteredListSections.length === 0
      : sectionsForAdmin.length === 0;
    const hasExpandedOther =
      eventTypeFilter !== 'FRC' && otherEventsSorted.some((ev) => Boolean(expandedEventIds[ev.id]));
    const frcColSpan = frcEventsSorted.length;
    const otherColSpan = otherEventsSorted.reduce(
      (sum, ev) => sum + (expandedEventIds[ev.id] ? 4 : 1),
      0
    );

    return (
      <Card className={cardClass}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-xs sm:text-sm">
            <thead className="bg-muted">
              <tr>
                <th
                  rowSpan={hasExpandedOther ? 3 : 2}
                  className="sticky left-0 bg-muted pl-4 pr-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] z-30 min-w-[165px] sm:min-w-[190px] border-r border-border/60 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-none"
                >
                  Student
                </th>
                {eventTypeFilter !== 'Events' && frcEventsSorted.length > 0 && (
                  <th
                    colSpan={frcColSpan}
                    className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] border-b border-r border-border/50"
                  >
                    FRC
                  </th>
                )}
                {eventTypeFilter !== 'FRC' && otherEventsSorted.length > 0 && (
                  <th
                    colSpan={otherColSpan}
                    className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] border-b border-border/50"
                  >
                    Events
                  </th>
                )}
                <th
                  rowSpan={hasExpandedOther ? 3 : 2}
                  className="sticky right-0 bg-muted pl-3 pr-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] w-24 z-30 border-l border-border/60 shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-none"
                >
                  Penalty
                </th>
              </tr>
              <tr>
                {eventTypeFilter !== 'Events' && frcEventsSorted.map((event) => (
                  <th
                    key={`${modePrefix}-frc-${event.id}`}
                    rowSpan={hasExpandedOther ? 2 : 1}
                    title={event.name}
                    className="px-2 py-1.5 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider min-w-[92px] border-r border-border/30"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="truncate max-w-[140px] text-foreground font-medium">{event.name}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                        {Number(event.penalty_hours || 0)}h
                      </span>
                    </div>
                  </th>
                ))}
                {eventTypeFilter !== 'FRC' && otherEventsSorted.map((event) => {
                  const isExpanded = Boolean(expandedEventIds[event.id]);
                  return (
                    <th
                      key={`${modePrefix}-evt-${event.id}`}
                      colSpan={isExpanded ? 4 : 1}
                      rowSpan={hasExpandedOther && !isExpanded ? 2 : 1}
                      onClick={() => toggleExpandEvent(event.id)}
                      title={`${event.name} — ${isExpanded ? 'Click to collapse sessions' : 'Click to expand 4 sessions'}`}
                      className="px-2 py-1.5 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider min-w-[96px] border-r border-border/30 cursor-pointer hover:bg-accent transition-colors"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 text-foreground font-medium">
                          <span className="truncate max-w-[140px]">{event.name}</span>
                          <span className="text-[10px] text-primary">{isExpanded ? '▾' : '▸'}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {new Date(event.event_date).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                          {Number(event.penalty_hours || 0)}h
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
              {hasExpandedOther && (
                <tr className="border-t border-border/50 bg-muted/25">
                  {otherEventsSorted.map((event) =>
                    expandedEventIds[event.id]
                      ? SESSION_SLOTS.map((slot) => (
                          <th
                            key={`${modePrefix}-sub-${event.id}-${slot.key}`}
                            className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                          >
                            {slot.label}
                          </th>
                        ))
                      : null
                  )}
                </tr>
              )}
            </thead>
            <tbody className="bg-card divide-y divide-border/60">
              {studentsError && (
                <tr>
                  <td className="px-6 py-4 text-sm text-destructive" colSpan={2 + totalEventCols}>
                    {studentsError}
                  </td>
                </tr>
              )}
              {!studentsError && hasNoStudents && (
                <tr>
                  <td className="px-6 py-10 text-sm text-muted-foreground text-center" colSpan={2 + totalEventCols}>
                    No students found.
                  </td>
                </tr>
              )}
              {isStudentRole && !isMatrix ? (
                filteredListSections.map(({ section, students }) => (
                  <React.Fragment key={section}>
                    {students.map((student) => renderStudentRow(student, false))}
                  </React.Fragment>
                ))
              ) : yearFilter === 'all' ? (
                filteredGroupedYearSections.map(({ year, sections, total }) => (
                  <React.Fragment key={`${modePrefix}-year-${year}`}>
                    <tr className="bg-muted">
                      <td className="sticky left-0 bg-muted pl-4 pr-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground z-30 border-r border-border/60">
                        Year Level {year} <span className="text-muted-foreground font-normal">({total})</span>
                      </td>
                      <td colSpan={totalEventCols} className="bg-muted px-3 py-2" />
                      <td className="sticky right-0 bg-muted z-30 border-l border-border/60" />
                    </tr>
                    {sections.map(({ section, students }) =>
                      renderSectionGroup(year, section, students, modePrefix, isMatrix)
                    )}
                  </React.Fragment>
                ))
              ) : (
                sectionsForAdmin.map(({ section, students }) =>
                  renderSectionGroup(yearFilter, section, students, modePrefix, isMatrix)
                )
              )}
            </tbody>
          </table>
        </div>
        {eventsToShow.length === 0 && (
          <div className="px-4 py-2.5 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground">
            No events recorded for the selected filter yet. Events will appear as columns here once scheduled.
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground mb-1">
            {isStudentRole ? 'Attendance Record' : 'Attendance Roster'}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {isStudentRole ? 'My Attendance' : 'Attendance Management'}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {isAdminRole && (
            <>
              <Button onClick={onPrint} size="sm" className="rounded-full px-4 gap-2">
                <Download className="w-3.5 h-3.5" />
                Print
              </Button>
              <div className="inline-flex items-center rounded-full bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  aria-pressed={viewMode === 'matrix'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    viewMode === 'matrix'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Mark
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@media print { body * { visibility: hidden; } #attendance-print, #attendance-print * { visibility: visible; } #attendance-print { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="w-full sm:flex-1">
          <Label htmlFor="attendance-search" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Search
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="attendance-search"
              type="text"
              placeholder={isStudentRole ? 'Search events...' : 'Search students...'}
              className="pl-9 rounded-xl bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Event</Label>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-full sm:w-[130px] rounded-xl bg-card">
              <SelectValue placeholder="Filter events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="FRC">FRC</SelectItem>
              <SelectItem value="Events">Events</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!isStudentRole && (
          <div className="w-full sm:w-auto">
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Schedule</Label>
            <Select value={eventTimelineFilter} onValueChange={setEventTimelineFilter}>
              <SelectTrigger className="w-full sm:w-[140px] rounded-xl bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="held">Past &amp; Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {!isStudentRole && (
          <div className="w-full sm:w-auto">
            <Tabs value={yearFilter} onValueChange={setYearFilter}>
              <TabsList className="rounded-full bg-muted p-1 text-muted-foreground h-10">
                <TabsTrigger value="all" aria-label="All years" className="rounded-full px-3 h-8 text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  All
                </TabsTrigger>
                <TabsTrigger value="1" aria-label="1st Years" className="rounded-full px-3 h-8 text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <span className="md:hidden">1st</span>
                  <span className="hidden md:inline">1st Years</span>
                </TabsTrigger>
                <TabsTrigger value="2" aria-label="2nd Years" className="rounded-full px-3 h-8 text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <span className="md:hidden">2nd</span>
                  <span className="hidden md:inline">2nd Years</span>
                </TabsTrigger>
                <TabsTrigger value="3" aria-label="3rd Years" className="rounded-full px-3 h-8 text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <span className="md:hidden">3rd</span>
                  <span className="hidden md:inline">3rd Years</span>
                </TabsTrigger>
                <TabsTrigger value="4" aria-label="4th Years" className="rounded-full px-3 h-8 text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <span className="md:hidden">4th</span>
                  <span className="hidden md:inline">4th Years</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      <div id="attendance-print" ref={printRef}>
        {isStudentRole ? (
          <>
            <div className="lg:hidden">
              {(() => {
                const studentId = user?.id;
                const term = searchTerm.trim().toLowerCase();
                let presentCount = 0;
                let absentCount = 0;
                let totalPenalty = 0;

                const enriched = eventsToShow.map((ev) => {
                  const rec = attendanceMap.get(`${studentId}-${ev.id}`);
                  const isMulti = isMultiSessionEvent(ev);
                  const isUpcoming = isUpcomingEvent(ev);
                  const upcomingUnrecorded = !rec && isUpcoming;
                  const status = upcomingUnrecorded
                    ? 'upcoming'
                    : (rec?.status || 'absent').toLowerCase();
                  if (status === 'present') presentCount += 1;
                  if (status === 'absent') {
                    absentCount += 1;
                    totalPenalty += Number(ev.penalty_hours || 0);
                  }
                  return { ev, rec, isMulti, upcomingUnrecorded, status };
                });

                const filteredCards = enriched.filter(({ ev, status }) => {
                  if (term) {
                    const hay = `${ev.name || ''} ${ev.type || ''}`.toLowerCase();
                    if (!hay.includes(term)) return false;
                  }
                  if (mobileStatusTab === 'missed' && status !== 'absent') return false;
                  if (mobileStatusTab === 'upcoming' && status !== 'upcoming') return false;
                  return true;
                });

                return (
                  <div className="space-y-4">
                    {/* 3-Stat Summary Strip */}
                    <div className="grid grid-cols-3 rounded-2xl border border-border/60 bg-card divide-x divide-border/60 text-center py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-none">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Present</div>
                        <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{presentCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Absent</div>
                        <div className="text-lg font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{absentCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Penalty</div>
                        <div className="text-lg font-semibold text-foreground tabular-nums">{totalPenalty}h</div>
                      </div>
                    </div>

                    {/* All | Missed | Upcoming Pill Tabs */}
                    <div className="inline-flex items-center rounded-full bg-muted p-1">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'missed', label: 'Missed' },
                        { id: 'upcoming', label: 'Upcoming' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setMobileStatusTab(tab.id)}
                          className={`px-3.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            mobileStatusTab === tab.id
                              ? 'bg-card text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Event Timeline Cards */}
                    {filteredCards.length === 0 ? (
                      <Card className={cardClass}>
                        <div className="py-10 px-4 text-center text-sm text-muted-foreground">
                          No matching events found.
                        </div>
                      </Card>
                    ) : (
                      <div className="space-y-2.5">
                        {filteredCards.map(({ ev, rec, isMulti, upcomingUnrecorded, status }) => {
                          const isExpanded = isMulti && Boolean(expandedEventIds[ev.id]);
                          const borderCol =
                            status === 'present'
                              ? 'border-l-emerald-500'
                              : status === 'absent'
                              ? 'border-l-rose-500'
                              : 'border-l-muted-foreground/40';
                          const penHours = Number(ev.penalty_hours || 0);
                          const penaltyTag =
                            status === 'absent'
                              ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                  +{penHours}h penalty
                                </span>
                              )
                              : status === 'present'
                              ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums bg-muted text-muted-foreground">
                                  0h penalty
                                </span>
                              )
                              : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums bg-muted text-muted-foreground">
                                  {penHours}h if missed
                                </span>
                              );

                          return (
                            <div
                              key={`mob-${ev.id}`}
                              onClick={isMulti ? () => toggleExpandEvent(ev.id) : undefined}
                              className={`rounded-xl border border-border/60 border-l-4 ${borderCol} bg-card p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-none ${
                                isMulti ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                    <span className="truncate">{ev.name}</span>
                                    {isMulti && (
                                      <span className="text-[10px] text-primary shrink-0">
                                        {isExpanded ? '▾' : '▸'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
                                    {ev.type} · {new Date(ev.event_date).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {getStatusBadge(status, isMulti && !upcomingUnrecorded ? getSessionCount(rec) : null)}
                                  {penaltyTag}
                                </div>
                              </div>

                              {isMulti && isExpanded && (
                                <div className="mt-3 pt-2.5 border-t border-border/60 grid grid-cols-4 gap-1.5">
                                  {SESSION_SLOTS.map((slot) => {
                                    if (upcomingUnrecorded) {
                                      return (
                                        <div
                                          key={`mob-slot-${ev.id}-${slot.key}`}
                                          className="text-center py-1.5 rounded-lg bg-muted/60 text-[10px] text-muted-foreground"
                                        >
                                          <div>{slot.label}</div>
                                          <div className="font-semibold mt-0.5">—</div>
                                        </div>
                                      );
                                    }
                                    const ok = Boolean(rec?.[slot.key]);
                                    return (
                                      <div
                                        key={`mob-slot-${ev.id}-${slot.key}`}
                                        className={`text-center py-1.5 rounded-lg text-[10px] ${
                                          ok
                                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                        }`}
                                      >
                                        <div>{slot.label}</div>
                                        <div className="font-bold mt-0.5">{ok ? '✓' : '✕'}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="hidden lg:block">
              {renderAttendanceTable(false)}
            </div>
          </>
        ) : (
          renderAttendanceTable(viewMode === 'matrix')
        )}
      </div>
    </div>
  );
};

export default AttendanceManagement;
