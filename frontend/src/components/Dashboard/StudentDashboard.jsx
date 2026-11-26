import axios from 'axios';
import {
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  ClipboardList,
  XCircle,
  ArrowUpRight,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const StudentDashboard = ({ onNavigate }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    const onFocus = () => fetchDashboardData();
    window.addEventListener('focus', onFocus);
    const intervalId = setInterval(fetchDashboardData, 10000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(intervalId);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { serviceHours, upcomingEvents, availableTasks, recentAttendance, attendanceSummary } =
    dashboardData || {};
  const rendered = Number(serviceHours?.rendered || 0);
  const penalty = Number(serviceHours?.penalty || 0);
  const remaining = penalty - rendered;
  const progressPct = penalty > 0 ? Math.min(100, Math.round((rendered / penalty) * 100)) : 0;

  const recentAttendanceSorted = (recentAttendance || []).slice().sort((a, b) => {
    const da = a?.event_date ? new Date(a.event_date) : new Date(0);
    const db = b?.event_date ? new Date(b.event_date) : new Date(0);
    return db - da;
  });

  const cardClass =
    'rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.03)] dark:shadow-none';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground mb-1">
            Student Overview
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            My Service Summary
          </h2>
        </div>
        {onNavigate && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-4 border-border/80"
              onClick={() => onNavigate('attendance')}
            >
              My Attendance
            </Button>
            <Button
              size="sm"
              className="rounded-full px-4"
              onClick={() => onNavigate('tasks')}
            >
              Browse Tasks <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Hours Rendered</span>
              <CheckCircle className="w-4 h-4 text-emerald-500/80" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {rendered}
              <span className="text-base font-normal text-muted-foreground ml-1">hrs</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Approved service hours</p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Absents</span>
              <AlertCircle className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {attendanceSummary?.totalAbsents || 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              Attendance rate: {attendanceSummary?.attendanceRate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Penalty Hours</span>
              <AlertCircle className="w-4 h-4 text-rose-500/80" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {penalty}
              <span className="text-base font-normal text-muted-foreground ml-1">hrs</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Total required</p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Remaining Hours</span>
              <Clock className="w-4 h-4 text-amber-500/80" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {remaining}
              <span className="text-base font-normal text-muted-foreground ml-1">hrs</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {remaining <= 0 ? 'All cleared' : 'Hours to complete'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar Card */}
      <Card className={cardClass}>
        <CardContent className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Service Hours Progress</h3>
            <span className="text-sm font-semibold tabular-nums text-foreground">{progressPct}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{rendered} hours completed</span>
            <span>{penalty} penalty hours</span>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={cardClass}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Upcoming Events</h3>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('events')}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  Calendar <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {upcomingEvents?.length > 0 ? (
              <div className="divide-y divide-border/70">
                {upcomingEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium text-foreground truncate">{event.name}</p>
                      <p className="text-xs text-muted-foreground">{event.type}</p>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(event.event_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{event.start_time || 'All day'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium text-foreground">No upcoming events</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Available Tasks</h3>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('tasks')}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  Browse all <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {availableTasks?.length > 0 ? (
              <div className="divide-y divide-border/70">
                {availableTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {task.hours_offered} hours
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shrink-0">
                      {task.max_participants
                        ? `${task.max_participants - (task.current_participants || 0)} slots`
                        : 'Open'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium text-foreground">No available tasks</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card className={cardClass}>
        <CardContent className="p-5 sm:p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Recent Attendance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/70">
              <thead>
                <tr>
                  <th className="py-2.5 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Event
                  </th>
                  <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-2.5 pl-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {recentAttendanceSorted?.length > 0 ? (
                  recentAttendanceSorted.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">{record.event_name}</div>
                        <div className="text-xs text-muted-foreground">{record.type}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                        {new Date(record.event_date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 pl-4 whitespace-nowrap text-right">
                        {(() => {
                          const norm = (record.status || '').toString().toLowerCase();
                          const isPresent = norm === 'present';
                          const isAbsent = norm === 'absent';
                          const cls = isPresent
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : isAbsent
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                            : 'bg-muted text-muted-foreground';
                          const Icon = isPresent ? CheckCircle : XCircle;
                          const label = isPresent ? 'Present' : isAbsent ? 'Absent' : 'Unknown';
                          return (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${cls}`}
                            >
                              <Icon className="w-3 h-3 mr-1" /> {label}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-sm text-muted-foreground">
                      No attendance records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
