import axios from 'axios';
import { Search, Download, CheckCircle, XCircle, Eye, CheckSquare, ChevronDown, ChevronRight, Clock } from 'lucide-react';
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

  const attendanceMap = useMemo(() => {
    const map = new Map();
    for (const rec of attendance) {
      if (rec.user_id && rec.event_id) {
        map.set(`${rec.user_id}-${rec.event_id}`, rec.status);
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

  const frcEventsSorted = useMemo(() => (
    events
      .filter(e => (e.type || '').toUpperCase() === 'FRC')
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  ), [events]);

  const otherEventsSorted = useMemo(() => (
    events
      .filter(e => (e.type || '').toUpperCase() !== 'FRC')
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  ), [events]);

  const eventsSorted = useMemo(() => ([...frcEventsSorted, ...otherEventsSorted]), [frcEventsSorted, otherEventsSorted]);
  const eventsToShow = useMemo(() => {
    if (eventTypeFilter === 'FRC') return frcEventsSorted;
    if (eventTypeFilter === 'Events') return otherEventsSorted;
    return eventsSorted;
  }, [eventTypeFilter, frcEventsSorted, otherEventsSorted, eventsSorted]);

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

  const computeTotalPenalty = (studentId) => {
    let total = 0;
    for (const ev of eventsToShow) {
      const key = `${studentId}-${ev.id}`;
      const recorded = attendanceMap.get(key);
      if (!recorded && isUpcomingEvent(ev)) continue;
      const status = (recorded || 'absent').toLowerCase();
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
      setAttendance((curr) => {
        const next = [...curr];
        const idx = next.findIndex(r => r.user_id === userId && r.event_id === eventId);
        if (idx >= 0) {
          next[idx] = { ...next[idx], status: status.toLowerCase() };
        } else {
          next.push({ user_id: userId, event_id: eventId, status: status.toLowerCase() });
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
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });
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

  const getStatusBadge = (status) => {
    const badges = {
      present: { icon: CheckCircle, class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', text: 'Present' },
      absent: { icon: XCircle, class: 'bg-rose-500/15 text-rose-700 dark:text-rose-400', text: 'Absent' },
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

  const renderStudentRow = (student, isMatrix) => {
    const penalty = computeTotalPenalty(student.id);
    return (
      <tr key={student.id} className="hover:bg-muted/35 transition-colors">
        <td className="sticky left-0 bg-card pl-4 pr-3 py-3 whitespace-nowrap z-10 min-w-[200px] sm:min-w-[240px] border-r border-border/50">
          <div className="text-sm font-medium text-foreground">{getDisplayName(student)}</div>
          <div className="text-xs text-muted-foreground font-mono tabular-nums">{student.student_id}</div>
        </td>
        {eventsToShow.map((event) => {
          const key = `${student.id}-${event.id}`;
          const recorded = attendanceMap.get(key);
          const status = (!recorded && isUpcomingEvent(event))
            ? 'upcoming'
            : (recorded || 'absent').toLowerCase();
          if (isMatrix) {
            const checked = status === 'present';
            return (
              <td key={event.id} className="px-3 py-3 whitespace-nowrap text-center align-middle">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary border-border rounded focus:ring-primary cursor-pointer"
                  checked={checked}
                  onChange={(e) => recordAttendance(event.id, student.id, e.target.checked ? 'present' : 'absent')}
                  aria-label={`Toggle attendance for ${getDisplayName(student)} in ${event.name}`}
                />
              </td>
            );
          }
          return (
            <td key={event.id} className="px-2 py-3 whitespace-nowrap text-center align-middle">
              {getStatusBadge(status)}
            </td>
          );
        })}
        <td className="pl-3 pr-5 py-3 whitespace-nowrap text-right align-middle w-28">
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
        <tr className="bg-muted/25 hover:bg-muted/45 transition-colors">
          <td
            className="sticky left-0 bg-muted/25 pl-4 pr-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer z-20 border-r border-border/50"
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
          <td colSpan={eventsToShow.length + 1} className="px-3 py-2" />
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

    return (
      <Card className={cardClass}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-xs sm:text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 bg-muted/40 backdrop-blur-sm pl-4 pr-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] z-20 min-w-[200px] sm:min-w-[240px] border-r border-border/50"
                >
                  {isStudentRole ? 'Student' : 'Student'}
                </th>
                {eventTypeFilter !== 'Events' && frcEventsSorted.length > 0 && (
                  <th
                    colSpan={frcEventsSorted.length}
                    className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] border-b border-border/50"
                  >
                    FRC
                  </th>
                )}
                {eventTypeFilter !== 'FRC' && otherEventsSorted.length > 0 && (
                  <th
                    colSpan={otherEventsSorted.length}
                    className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] border-b border-border/50"
                  >
                    Events
                  </th>
                )}
                <th
                  rowSpan={2}
                  className="pl-3 pr-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] w-28"
                >
                  Penalty
                </th>
              </tr>
              <tr>
                {eventTypeFilter !== 'Events' && frcEventsSorted.map((event) => (
                  <th
                    key={`${modePrefix}-frc-${event.id}`}
                    className="px-2 py-1.5 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider min-w-[96px]"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="truncate max-w-[100px] text-foreground font-medium">{event.name}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                        {Number(event.penalty_hours || 0)}h
                      </span>
                    </div>
                  </th>
                ))}
                {eventTypeFilter !== 'FRC' && otherEventsSorted.map((event) => (
                  <th
                    key={`${modePrefix}-evt-${event.id}`}
                    className="px-2 py-1.5 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider min-w-[96px]"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="truncate max-w-[100px] text-foreground font-medium">{event.name}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                        {Number(event.penalty_hours || 0)}h
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border/60">
              {studentsError && (
                <tr>
                  <td className="px-6 py-4 text-sm text-destructive" colSpan={2 + eventsToShow.length}>
                    {studentsError}
                  </td>
                </tr>
              )}
              {!studentsError && hasNoStudents && (
                <tr>
                  <td className="px-6 py-10 text-sm text-muted-foreground text-center" colSpan={2 + eventsToShow.length}>
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
                    <tr className="bg-muted/55">
                      <td className="sticky left-0 bg-muted/55 pl-4 pr-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground z-30 border-r border-border/50">
                        Year Level {year} <span className="text-muted-foreground font-normal">({total})</span>
                      </td>
                      <td colSpan={eventsToShow.length + 1} className="px-3 py-2" />
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
            Attendance Roster
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Attendance Management
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
              placeholder="Search students..."
              className="pl-9 rounded-xl bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Event</Label>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-xl bg-card">
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
        {renderAttendanceTable(viewMode === 'matrix' && !isStudentRole)}
      </div>
    </div>
  );
};

export default AttendanceManagement;
