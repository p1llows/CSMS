import axios from 'axios';
import {
  Users,
  Calendar,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const chartConfig = {
  present: {
    label: 'Present',
    theme: {
      light: '#881D3D',
      dark: '#F1B5C5',
    },
  },
  absent: {
    label: 'Absent',
    color: '#D94875',
  },
};

const AdminDashboard = ({ onNavigate }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('all');

  useEffect(() => {
    fetchDashboardData();
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

  const {
    totalStudents,
    totalEvents,
    upcomingEvents,
    recentTasks,
    attendanceStats,
    attendanceSeries = [],
    serviceHoursStats,
  } = dashboardData || {};

  const filteredSeries = useMemo(() => {
    if (!Array.isArray(attendanceSeries) || attendanceSeries.length === 0) return [];
    const base =
      range === 'all'
        ? attendanceSeries
        : attendanceSeries.filter((item) => {
            const days = range === '30d' ? 30 : 90;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            return new Date(item.event_date) >= cutoff;
          });
    return base.map((ev) => ({
      ...ev,
      dateLabel: new Date(ev.event_date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [attendanceSeries, range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasLastEvent = Boolean(attendanceStats?.lastEventName);
  const presentCount = hasLastEvent ? (attendanceStats?.present || 0) : 0;
  const absentCount = hasLastEvent ? (attendanceStats?.absent || 0) : 0;
  const attendanceTotal = presentCount + absentCount;
  const presentRatio = attendanceTotal > 0 ? Math.round((presentCount / attendanceTotal) * 100) : 0;

  const cardClass =
    'rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.03)] dark:shadow-none';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground mb-1">
            Operations Overview
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back
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
              Mark Attendance
            </Button>
            <Button
              size="sm"
              className="rounded-full px-4"
              onClick={() => onNavigate('tasks')}
            >
              Manage Tasks <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Students</span>
              <Users className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {totalStudents || 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Active student accounts</p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Attendance Rate</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {attendanceStats?.attendanceRate || 0}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              Overall average: {attendanceStats?.overallAttendanceRate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Events</span>
              <Calendar className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {totalEvents || 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Scheduled &amp; completed</p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Highest Penalty</span>
              <AlertCircle className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {serviceHoursStats?.highestPenalty || 0}
              <span className="text-base font-normal text-muted-foreground ml-1">hrs</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground truncate">
              {serviceHoursStats?.highestPenaltyUserName
                ? `By ${serviceHoursStats.highestPenaltyUserName}`
                : 'No penalties recorded'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Overview - shadcn Interactive Area Chart */}
      <Card className={cardClass}>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Attendance Overview</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {attendanceStats?.lastEventName ? (
                  <span className="inline-flex items-center gap-2">
                    <span>
                      Latest: {attendanceStats.lastEventName} · {presentRatio}% turnout ({presentCount} present, {absentCount} absent)
                    </span>
                    {attendanceStats?.lastEventType &&
                      String(attendanceStats.lastEventType).toUpperCase() === 'FRC' && (
                        <Badge variant="secondary" className="text-[10px] py-0">FRC</Badge>
                      )}
                  </span>
                ) : (
                  'Showing present vs. absent turnout across events'
                )}
              </p>
            </div>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[150px] h-8 text-xs rounded-lg bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredSeries.length > 0 ? (
            <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
              <AreaChart data={filteredSeries}>
                <defs>
                  <linearGradient id="fillPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-present)" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="var(--color-present)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="fillAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-absent)" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="var(--color-absent)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={(_, payload) => {
                        const ev = payload?.[0]?.payload;
                        return ev ? `${ev.name} (${ev.dateLabel})` : '';
                      }}
                    />
                  }
                />
                <Area
                  dataKey="absent"
                  type="natural"
                  fill="url(#fillAbsent)"
                  stroke="var(--color-absent)"
                  strokeWidth={2}
                  dot={filteredSeries.length === 1 ? { r: 4 } : false}
                  activeDot={{ r: 5 }}
                />
                <Area
                  dataKey="present"
                  type="natural"
                  fill="url(#fillPresent)"
                  stroke="var(--color-present)"
                  strokeWidth={2}
                  dot={filteredSeries.length === 1 ? { r: 4 } : false}
                  activeDot={{ r: 5 }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[240px] flex flex-col items-center justify-center text-center space-y-2">
              <TrendingUp className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No past events recorded yet</p>
              <p className="text-xs text-muted-foreground">
                Turnout curves for Present and Absent students will appear here once events occur.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Column Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card className={cardClass}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">Upcoming Events</h3>
                {upcomingEvents?.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ({upcomingEvents.length})
                  </span>
                )}
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('events')}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  View calendar <ArrowUpRight className="w-3.5 h-3.5" />
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
              <div className="py-8 text-center space-y-3">
                <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">No upcoming events</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Schedule an event to start tracking attendance.
                  </p>
                </div>
                {onNavigate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-4"
                    onClick={() => onNavigate('events')}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Schedule Event
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className={cardClass}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">Recent Tasks</h3>
                {recentTasks?.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ({recentTasks.length})
                  </span>
                )}
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('tasks')}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  View all <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {recentTasks?.length > 0 ? (
              <div className="divide-y divide-border/70">
                {recentTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">By {task.created_by_name}</p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {task.hours_offered}h
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          task.status === 'open'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : task.status === 'in_progress'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">No recent tasks</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Create a community service task for students to apply.
                  </p>
                </div>
                {onNavigate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-4"
                    onClick={() => onNavigate('tasks')}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Task
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
