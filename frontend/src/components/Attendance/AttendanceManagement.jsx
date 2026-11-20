import axios from 'axios';
import { Search, Download, CheckCircle, XCircle, List, LayoutGrid, ChevronDown, ChevronRight } from 'lucide-react';
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

  const computeTotalPenalty = (studentId) => {
    let total = 0;
    for (const ev of eventsToShow) {
      const key = `${studentId}-${ev.id}`;
      const status = (attendanceMap.get(key) || 'absent').toLowerCase();
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
      present: { icon: CheckCircle, class: 'bg-green-100 text-green-800', text: 'Present' },
      absent: { icon: XCircle, class: 'bg-red-100 text-red-800', text: 'Absent' }
    };
    const badge = badges[status] || { icon: XCircle, class: 'bg-gray-100 text-gray-800', text: 'Unknown' };
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Attendance Management</h2>
        <div className="flex items-center gap-2">
          {((user?.role || '').toString().toUpperCase() === 'ADMIN') && (
            <>
              <Button onClick={onPrint} className="inline-flex items-center gap-2">
                <Download className="w-4 h-4" />
                Print
              </Button>
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <Button
                  variant="ghost"
                  className={
                    `rounded-none px-3 py-2 ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground'}`
                  }
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                >
                  <List className="w-4 h-4 mr-2" />
                  List
                </Button>
                <Button
                  variant="ghost"
                  className={
                    `rounded-none px-3 py-2 border-l border-border ${viewMode === 'matrix' ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground'}`
                  }
                  onClick={() => setViewMode('matrix')}
                  aria-pressed={viewMode === 'matrix'}
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Matrix
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@media print { body * { visibility: hidden; } #attendance-print, #attendance-print * { visibility: visible; } #attendance-print { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4">
        <div className="w-full sm:flex-1">
          <Label htmlFor="attendance-search" className="inline-block mb-1">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="attendance-search"
              type="text"
              placeholder="Search students..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <Label className="inline-block mb-1">Event</Label>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="FRC">FRC</SelectItem>
              <SelectItem value="Events">Events</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {((user?.role || '').toString().toUpperCase() !== 'STUDENT') && (
          <div className="w-full sm:w-auto">
            <Tabs value={yearFilter} onValueChange={setYearFilter}>
              <TabsList className="rounded-md bg-accent/60 p-0 border border-border text-muted-foreground overflow-hidden h-9">
                <TabsTrigger value="all" aria-label="All years" className="rounded-none first:rounded-l-md last:rounded-r-md px-3 py-0 h-9 text-sm transition-colors hover:text-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:rounded-md data-[state=active]:shadow-[inset_0_1px_0_0_rgba(236,72,153,0.45),inset_0_-1px_0_0_rgba(236,72,153,0.45)]">
                  <span className="md:hidden">All</span>
                  <span className="hidden md:inline">All</span>
                </TabsTrigger>
                <TabsTrigger value="1" aria-label="1st Years" className="rounded-none first:rounded-l-md last:rounded-r-md px-3 py-0 h-9 text-sm transition-colors hover:text-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:rounded-md data-[state=active]:shadow-[inset_0_1px_0_0_rgba(236,72,153,0.45),inset_0_-1px_0_0_rgba(236,72,153,0.45)]">
                  <span className="md:hidden">1st Yrs</span>
                  <span className="hidden md:inline">1st Years</span>
                </TabsTrigger>
                <TabsTrigger value="2" aria-label="2nd Years" className="rounded-none first:rounded-l-md last:rounded-r-md px-3 py-0 h-9 text-sm transition-colors hover:text-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:rounded-md data-[state=active]:shadow-[inset_0_1px_0_0_rgba(236,72,153,0.45),inset_0_-1px_0_0_rgba(236,72,153,0.45)]">
                  <span className="md:hidden">2nd Yrs</span>
                  <span className="hidden md:inline">2nd Years</span>
                </TabsTrigger>
                <TabsTrigger value="3" aria-label="3rd Years" className="rounded-none first:rounded-l-md last:rounded-r-md px-3 py-0 h-9 text-sm transition-colors hover:text-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:rounded-md data-[state=active]:shadow-[inset_0_1px_0_0_rgba(236,72,153,0.45),inset_0_-1px_0_0_rgba(236,72,153,0.45)]">
                  <span className="md:hidden">3rd Yrs</span>
                  <span className="hidden md:inline">3rd Years</span>
                </TabsTrigger>
                <TabsTrigger value="4" aria-label="4th Years" className="rounded-none first:rounded-l-md last:rounded-r-md px-3 py-0 h-9 text-sm transition-colors hover:text-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:rounded-md data-[state=active]:shadow-[inset_0_1px_0_0_rgba(236,72,153,0.45),inset_0_-1px_0_0_rgba(236,72,153,0.45)]">
                  <span className="md:hidden">4th Yrs</span>
                  <span className="hidden md:inline">4th Years</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      <div id="attendance-print" ref={printRef}>
      {viewMode === 'matrix' && ((user?.role || '').toString().toUpperCase() !== 'STUDENT') ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-xs sm:text-sm">
              <thead className="bg-accent">
                <tr>
                  <th rowSpan={2} className="sticky left-0 bg-accent pl-2 pr-1 sm:px-4 py-3 text-left text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider z-20 w-[100px] sm:w-[160px] border-r border-border">
                    Student
                  </th>
                  {eventTypeFilter !== 'Events' && frcEventsSorted.length > 0 && (
                    <th colSpan={frcEventsSorted.length} className="px-1 sm:px-2 py-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      FRC
                    </th>
                  )}
                  {eventTypeFilter !== 'FRC' && otherEventsSorted.length > 0 && (
                    <th colSpan={otherEventsSorted.length} className="px-1 sm:px-2 py-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Events
                    </th>
                  )}
                  <th rowSpan={2} className="px-1 sm:px-3 py-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider w-[60px] sm:w-[80px]">
                    Penalty
                  </th>
                </tr>
                <tr>
                  {eventTypeFilter !== 'Events' && frcEventsSorted.map((event) => (
                    <th key={`frc-${event.id}`} className="px-1 sm:px-2 py-1 text-center text-[9px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-[80px] sm:w-[120px]">
                      <div className="flex flex-col items-center">
                        <span className="truncate max-w-[70px] sm:max-w-[110px] text-[8px] sm:text-[10px]">{event.name}</span>
                        <span className="text-[7px] sm:text-[9px] text-muted-foreground">{new Date(event.event_date).toLocaleDateString()}</span>
                        <span className="text-[7px] sm:text-[9px] text-red-600 font-semibold">{Number(event.penalty_hours || 0)}h</span>
                      </div>
                    </th>
                  ))}
                  {eventTypeFilter !== 'FRC' && otherEventsSorted.map((event) => (
                    <th key={`evt-${event.id}`} className="px-1 sm:px-2 py-1 text-center text-[9px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-[80px] sm:w-[120px]">
                      <div className="flex flex-col items-center">
                        <span className="truncate max-w-[70px] sm:max-w-[110px] text-[8px] sm:text-[10px]">{event.name}</span>
                        <span className="text-[7px] sm:text-[9px] text-muted-foreground">{new Date(event.event_date).toLocaleDateString()}</span>
                        <span className="text-[7px] sm:text-[9px] text-red-600 font-semibold">{Number(event.penalty_hours || 0)}h</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {studentsError && (
                  <tr>
                    <td className="px-6 py-4 text-sm text-red-600" colSpan={1 + eventsToShow.length}>
                      {studentsError}
                    </td>
                  </tr>
                )}
                {(!studentsError && sectionsForAdmin.length === 0) && (
                  <tr>
                    <td className="px-6 py-6 text-sm text-muted-foreground text-center" colSpan={1 + eventsToShow.length}>
                      No students found.
                    </td>
                  </tr>
                )}
                {(yearFilter === 'all' ? filteredGroupedYearSections : []).map(({ year, sections, total }) => (
                  <React.Fragment key={`tab-year-${year}`}>
                    <tr className="bg-accent">
                      <td className="sticky left-0 bg-accent pl-2 pr-1 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-foreground z-30 w-[100px] sm:w-[160px] border-r border-border">
                        Year Level {year} ({total} students)
                      </td>
                      <td colSpan={eventsToShow.length + 1} className="px-3 py-2 bg-accent"></td>
                    </tr>
                    {sections.map(({ section, students }) => {
                      const secKey = `tab|${year}|${section}`;
                      return (
                        <React.Fragment key={secKey}>
                          <tr className="bg-accent">
                            <td
                              className="sticky left-0 bg-accent pl-2 pr-1 sm:px-4 py-2 text-[11px] sm:text-sm font-semibold text-foreground cursor-pointer z-20 w-[100px] sm:w-[160px] border-r border-border"
                              onClick={() => toggleSection(secKey)}
                            >
                              <span className="inline-flex items-center mr-2">
                                {collapsedSections[secKey] ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </span>
                              Section {section} ({students.length} students)
                            </td>
                            <td colSpan={eventsToShow.length + 1} className="px-3 py-2 bg-accent"></td>
                          </tr>
                          {!collapsedSections[secKey] && students.map((student) => (
                            <tr key={student.id} className="hover:bg-accent/40 h-12 sm:h-14 align-middle">
                              <td className="sticky left-0 bg-card hover:bg-accent/40 pl-2 pr-1 sm:px-4 py-2 whitespace-nowrap text-[11px] sm:text-sm z-10 align-middle border-r border-border">
                                <div>
                                  <div className="font-medium text-foreground">
                                    {getDisplayName(student)}
                                  </div>
                                  <div className="text-muted-foreground">{student.student_id}</div>
                                </div>
                              </td>
                              {eventsToShow.map((event) => {
                                const key = `${student.id}-${event.id}`;
                                const status = (attendanceMap.get(key) || 'absent').toLowerCase();
                                const checked = status === 'present';
                                return (
                                  <td key={event.id} className="px-3 py-3 whitespace-nowrap text-center align-middle">
                                    <input
                                      type="checkbox"
                                      className="w-3 h-3 sm:w-4 sm:h-4 accent-primary border-border rounded focus:ring-primary-500 cursor-pointer"
                                      checked={checked}
                                      onChange={(e) => recordAttendance(event.id, student.id, e.target.checked ? 'present' : 'absent')}
                                      aria-label={`Toggle attendance for ${getDisplayName(student)} in ${event.name}`}
                                    />
                                  </td>
                                );
                              })}
                              <td className="px-1 sm:px-2 py-3 text-[10px] sm:text-sm text-center font-semibold whitespace-nowrap align-middle">{computeTotalPenalty(student.id)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                ))}
                {(yearFilter !== 'all') && sectionsForAdmin.map(({ section, students }) => {
                  const secKey = `tab|${yearFilter}|${section}`;
                  return (
                    <React.Fragment key={secKey}>
                      <tr className="bg-accent">
                        <td
                          className="sticky left-0 bg-accent pl-2 pr-1 sm:px-4 py-2 text-[11px] sm:text-sm font-semibold text-foreground cursor-pointer z-20 w-[100px] sm:w-[160px] border-r border-border"
                          onClick={() => toggleSection(secKey)}
                        >
                          <span className="inline-flex items-center mr-2">
                            {collapsedSections[secKey] ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </span>
                          Section {section} ({students.length} students)
                        </td>
                        <td colSpan={eventsToShow.length + 1} className="px-3 py-2 bg-accent"></td>
                      </tr>
                      {!collapsedSections[secKey] && students.map((student) => (
                        <tr key={student.id} className="hover:bg-accent/40 h-12 sm:h-14 align-middle">
                          <td className="sticky left-0 bg-card hover:bg-accent/40 pl-1 pr-1 sm:px-3 py-2 whitespace-nowrap text-[11px] sm:text-sm z-20 w-[80px] sm:w-[140px] border-r border-border">
                            <div>
                              <div className="font-medium text-foreground">
                                {getDisplayName(student)}
                              </div>
                              <div className="text-muted-foreground">{student.student_id}</div>
                            </div>
                          </td>
                          {eventsToShow.map((event) => {
                            const key = `${student.id}-${event.id}`;
                            const status = (attendanceMap.get(key) || 'absent').toLowerCase();
                            const checked = status === 'present';
                            return (
                              <td key={event.id} className="px-3 py-3 whitespace-nowrap text-center align-middle">
                                <input
                                  type="checkbox"
                                  className="w-3 h-3 sm:w-4 sm:h-4 accent-primary border-border rounded focus:ring-primary-500 cursor-pointer"
                                  checked={checked}
                                  onChange={(e) => recordAttendance(event.id, student.id, e.target.checked ? 'present' : 'absent')}
                                  aria-label={`Toggle attendance for ${getDisplayName(student)} in ${event.name}`}
                                />
                              </td>
                            );
                          })}
                          <td className="px-1 sm:px-2 py-3 text-[10px] sm:text-sm text-center font-semibold whitespace-nowrap align-middle">{computeTotalPenalty(student.id)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-xs sm:text-sm">
              <thead className="bg-accent">
                <tr>
                  <th rowSpan={2} className="sticky left-0 bg-accent pl-2 pr-1 sm:px-4 py-3 text-left text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider z-20 w-[100px] sm:w-[160px] border-r border-border">
                    {((user?.role || '').toString().toUpperCase() === 'STUDENT') ? 'Me' : 'Student'}
                  </th>
                  {eventTypeFilter !== 'Events' && frcEventsSorted.length > 0 && (
                    <th colSpan={frcEventsSorted.length} className="px-1 sm:px-2 py-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      FRC
                    </th>
                  )}
                  {eventTypeFilter !== 'FRC' && otherEventsSorted.length > 0 && (
                    <th colSpan={otherEventsSorted.length} className="px-1 sm:px-2 py-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Events
                    </th>
                  )}
                  <th rowSpan={2} className="px-1 sm:px-3 py-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider w-[60px] sm:w-[80px]">
                    Penalty
                  </th>
                </tr>
                <tr>
                  {eventTypeFilter !== 'Events' && frcEventsSorted.map((event) => (
                    <th key={`list-frc-${event.id}`} className="px-1 sm:px-2 py-1 text-center text-[9px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-[80px] sm:w-[120px]">
                      <div className="flex flex-col items-center">
                        <span className="truncate max-w-[70px] sm:max-w-[110px] text-[8px] sm:text-[10px]">{event.name}</span>
                        <span className="text-[7px] sm:text-[9px] text-muted-foreground">{new Date(event.event_date).toLocaleDateString()}</span>
                        <span className="text-[7px] sm:text-[9px] text-red-600 font-semibold">{Number(event.penalty_hours || 0)}h</span>
                      </div>
                    </th>
                  ))}
                  {eventTypeFilter !== 'FRC' && otherEventsSorted.map((event) => (
                    <th key={`list-evt-${event.id}`} className="px-1 sm:px-2 py-1 text-center text-[9px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-[80px] sm:w-[120px]">
                      <div className="flex flex-col items-center">
                        <span className="truncate max-w-[70px] sm:max-w-[110px] text-[8px] sm:text-[10px]">{event.name}</span>
                        <span className="text-[7px] sm:text-[9px] text-muted-foreground">{new Date(event.event_date).toLocaleDateString()}</span>
                        <span className="text-[7px] sm:text-[9px] text-red-600 font-semibold">{Number(event.penalty_hours || 0)}h</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {studentsError && (
                  <tr>
                    <td className="px-6 py-4 text-sm text-red-600" colSpan={1 + eventsToShow.length}>
                      {studentsError}
                    </td>
                  </tr>
                )}
                {(!studentsError && (String((user?.role || '')).toUpperCase() === 'STUDENT' ? filteredListSections.length === 0 : sectionsForAdmin.length === 0)) && (
                  <tr>
                    <td className="px-6 py-6 text-sm text-muted-foreground text-center" colSpan={1 + eventsToShow.length}>
                      No students found.
                    </td>
                  </tr>
                )}
                {(String((user?.role || '')).toUpperCase() === 'STUDENT') ? (
                  filteredListSections.map(({ section, students }) => (
                    <React.Fragment key={section}>
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-accent/40">
                          <td className="sticky left-0 bg-card hover:bg-accent/40 pl-1 pr-1 sm:px-3 py-2 whitespace-nowrap text-[11px] sm:text-sm z-20 w-[80px] sm:w-[140px] border-r border-border">
                            <div>
                              <div className="font-medium text-foreground">
                                {getDisplayName(student)}
                              </div>
                              <div className="text-muted-foreground">{student.student_id}</div>
                            </div>
                          </td>
                          {eventsToShow.map((event) => {
                            const key = `${student.id}-${event.id}`;
                            const status = (attendanceMap.get(key) || 'absent').toLowerCase();
                            return (
                              <td key={event.id} className="px-1 py-2 whitespace-nowrap text-center">
                                {getStatusBadge(status)}
                              </td>
                            );
                          })}
                          <td className="px-1 sm:px-2 py-2 text-[10px] sm:text-sm text-center font-semibold whitespace-nowrap">{computeTotalPenalty(student.id)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  (yearFilter === 'all'
                    ? (
                      filteredGroupedYearSections.map(({ year, sections, total }) => (
                        <React.Fragment key={`list-year-${year}`}>
                          <tr className="bg-accent">
                            <td className="sticky left-0 bg-accent pl-2 pr-1 sm:px-4 py-2 text-sm font-bold text-foreground z-30 w-[100px] sm:w-[160px] border-r border-border">
                              Year Level {year} ({total} students)
                            </td>
                            <td colSpan={eventsToShow.length + 1} className="px-3 py-2 bg-accent"></td>
                          </tr>
                          {sections.map(({ section, students }) => {
                            const secKey = `list|${year}|${section}`;
                            return (
                              <React.Fragment key={`list-${secKey}`}>
                                <tr className="bg-accent">
                                  <td
                                    className="sticky left-0 bg-accent pl-2 pr-1 sm:px-4 py-2 text-sm font-semibold text-foreground z-20 w-[100px] sm:w-[160px] border-r border-border cursor-pointer"
                                    onClick={() => toggleSection(secKey)}
                                  >
                                    <span className="inline-flex items-center mr-2">
                                      {collapsedSections[secKey] ? (
                                        <ChevronRight className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </span>
                                    Section {section} ({students.length} students)
                                  </td>
                                  <td colSpan={eventsToShow.length + 1} className="px-3 py-2 bg-accent"></td>
                                </tr>
                                {!collapsedSections[secKey] && students.map((student) => (
                                  <tr key={student.id} className="hover:bg-accent/40 h-12 sm:h-14 align-middle">
                                    <td className="sticky left-0 bg-card hover:bg-accent/40 pl-1 pr-1 sm:px-3 py-2 whitespace-nowrap text-[11px] sm:text-sm z-20 w-[80px] sm:w-[140px] border-r border-border">
                                      <div>
                                        <div className="font-medium text-foreground">
                                          {getDisplayName(student)}
                                        </div>
                                        <div className="text-muted-foreground">{student.student_id}</div>
                                      </div>
                                    </td>
                                    {eventsToShow.map((event) => {
                                      const key = `${student.id}-${event.id}`;
                                      const status = (attendanceMap.get(key) || 'absent').toLowerCase();
                                      return (
                                        <td key={event.id} className="px-1 py-2 whitespace-nowrap text-center align-middle">
                                          {getStatusBadge(status)}
                                        </td>
                                      );
                                    })}
                                    <td className="px-1 sm:px-2 py-2 text-[10px] sm:text-sm text-center font-semibold whitespace-nowrap">{computeTotalPenalty(student.id)}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      ))
                    )
                    : (
                      sectionsForAdmin.map(({ section, students }) => {
                        const secKey = `list|${yearFilter}|${section}`;
                        return (
                          <React.Fragment key={`list-${secKey}`}>
                            <tr className="bg-accent">
                              <td
                                className="sticky left-0 bg-accent pl-2 pr-1 sm:px-4 py-2 text-sm font-semibold text-foreground z-20 w-[100px] sm:w-[160px] border-r border-border cursor-pointer"
                                onClick={() => toggleSection(secKey)}
                              >
                                <span className="inline-flex items-center mr-2">
                                  {collapsedSections[secKey] ? (
                                    <ChevronRight className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </span>
                                Section {section} ({students.length} students)
                              </td>
                              <td colSpan={eventsToShow.length + 1} className="px-3 py-2 bg-accent"></td>
                            </tr>
                            {!collapsedSections[secKey] && students.map((student) => (
                              <tr key={student.id} className="hover:bg-accent/40 h-12 sm:h-14 align-middle">
                                <td className="sticky left-0 bg-card hover:bg-accent/40 pl-1 pr-1 sm:px-3 py-2 whitespace-nowrap text-[11px] sm:text-sm z-20 w-[80px] sm:w-[140px] border-r border-border">
                                  <div>
                                    <div className="font-medium text-foreground">
                                      {getDisplayName(student)}
                                    </div>
                                    <div className="text-muted-foreground">{student.student_id}</div>
                                  </div>
                                </td>
                                {eventsToShow.map((event) => {
                                  const key = `${student.id}-${event.id}`;
                                  const status = (attendanceMap.get(key) || 'absent').toLowerCase();
                                  return (
                                    <td key={event.id} className="px-1 py-2 whitespace-nowrap text-center align-middle">
                                      {getStatusBadge(status)}
                                    </td>
                                  );
                                })}
                                <td className="px-1 sm:px-2 py-2 text-[10px] sm:text-sm text-center font-semibold whitespace-nowrap">{computeTotalPenalty(student.id)}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      </div>
    </div>
  );
};

export default AttendanceManagement;
