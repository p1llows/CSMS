import axios from 'axios';
import { Users, BadgeCheck, AlertTriangle, ClipboardList, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  Sector,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const EVENT_TYPE_COLORS = [
  '#E91890',
  '#F4B2D0',
  '#999999',
  '#B81070',
  '#F8CBE0',
  '#111111',
];

const attendanceChartConfig = {
  attendanceRate: {
    label: 'Attendance Rate (%)',
    theme: {
      light: '#E91890',
      dark: '#F472B6',
    },
  },
};

const serviceHoursChartConfig = {
  hoursRendered: {
    label: 'Hours Rendered',
    theme: {
      light: '#E91890',
      dark: '#F4B2D0',
    },
  },
  penaltyHours: {
    label: 'Penalty Hours',
    theme: {
      light: '#999999',
      dark: '#E91890',
    },
  },
};

const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeHoursSeries, setActiveHoursSeries] = useState('all');
  const [activeEventIndex, setActiveEventIndex] = useState(-1);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('/api/analytics/overview');
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const {
    attendanceTrends = [],
    serviceHoursTrends = [],
    eventTypes = [],
    topTasks = [],
    engagementRate,
    frcComplianceRate,
    taskFulfillmentRate,
    penaltyStudentsCount,
  } = analyticsData || {};

  const attendanceChartData = useMemo(
    () =>
      attendanceTrends.map((item) => ({
        date: new Date(item.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        fullDate: new Date(item.date).toLocaleDateString(),
        attendanceRate:
          item.total_expected > 0
            ? Number(((item.present_count / item.total_expected) * 100).toFixed(1))
            : 0,
      })),
    [attendanceTrends]
  );

  const serviceHoursChartData = useMemo(
    () =>
      serviceHoursTrends.map((item) => ({
        date: new Date(item.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        fullDate: new Date(item.date).toLocaleDateString(),
        hoursRendered: Number(item.hours_rendered || 0),
        penaltyHours: Number(item.penalty_hours || 0),
      })),
    [serviceHoursTrends]
  );

  const eventTypesChartData = useMemo(
    () =>
      eventTypes.map((item, idx) => ({
        type: item.type,
        count: Number(item.count || 0),
        fill: EVENT_TYPE_COLORS[idx % EVENT_TYPE_COLORS.length],
      })),
    [eventTypes]
  );

  const eventTypesChartConfig = useMemo(() => {
    const cfg = { count: { label: 'Events' } };
    eventTypesChartData.forEach((item) => {
      cfg[item.type] = { label: item.type, color: item.fill };
    });
    return cfg;
  }, [eventTypesChartData]);

  const totalEventsCount = useMemo(
    () => eventTypesChartData.reduce((sum, item) => sum + item.count, 0),
    [eventTypesChartData]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  const cardClass =
    'rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.03)] dark:shadow-none';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground mb-1">
            Telemetry &amp; Insights
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Analytics &amp; Reports
          </h2>
        </div>
        <span className="inline-flex items-center h-7 px-3 rounded-full bg-muted text-muted-foreground text-xs font-medium">
          All-time
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Student Engagement</span>
              <Users className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {typeof engagementRate === 'number' ? engagementRate : 0}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Active participation rate</p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">FRC Compliance</span>
              <BadgeCheck className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {typeof frcComplianceRate === 'number' ? frcComplianceRate : 0}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Mandatory event turnout</p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Task Fulfillment</span>
              <ClipboardList className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {typeof taskFulfillmentRate === 'number' ? taskFulfillmentRate : 0}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Completed assignments</p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Students With Penalty</span>
              <AlertTriangle className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {typeof penaltyStudentsCount === 'number' ? penaltyStudentsCount : 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Requiring service hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={cardClass}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Attendance Trends</h3>
                <p className="text-xs text-muted-foreground">Hover points to inspect session turnout</p>
              </div>
            </div>
            <div className="h-64">
              {attendanceChartData.length > 0 ? (
                <ChartContainer config={attendanceChartConfig} className="h-full w-full aspect-auto">
                  <AreaChart data={attendanceChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillAttendanceRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-attendanceRate)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--color-attendanceRate)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <ChartTooltip
                      cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                          formatter={(value) => [`${value}%`, 'Attendance Rate']}
                        />
                      }
                    />
                    <Area
                      dataKey="attendanceRate"
                      type="monotone"
                      fill="url(#fillAttendanceRate)"
                      stroke="var(--color-attendanceRate)"
                      strokeWidth={2.2}
                      activeDot={{ r: 5 }}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                  <TrendingUp className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No attendance trends yet</p>
                  <p className="text-xs text-muted-foreground">
                    Trends will appear after events and attendance are recorded.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Service Hours Trends</h3>
                <p className="text-xs text-muted-foreground">Toggle metrics or hover bars for details</p>
              </div>
              <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs">
                {[
                  { key: 'all', label: 'Both' },
                  { key: 'hoursRendered', label: 'Rendered' },
                  { key: 'penaltyHours', label: 'Penalty' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setActiveHoursSeries(opt.key)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      activeHoursSeries === opt.key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              {serviceHoursChartData.length > 0 ? (
                <ChartContainer config={serviceHoursChartConfig} className="h-full w-full aspect-auto">
                  <BarChart data={serviceHoursChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          indicator="dashed"
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                        />
                      }
                    />
                    {(activeHoursSeries === 'all' || activeHoursSeries === 'hoursRendered') && (
                      <Bar dataKey="hoursRendered" fill="var(--color-hoursRendered)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    )}
                    {(activeHoursSeries === 'all' || activeHoursSeries === 'penaltyHours') && (
                      <Bar dataKey="penaltyHours" fill="var(--color-penaltyHours)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    )}
                    <ChartLegend content={<ChartLegendContent />} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                  <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No service hours logged yet</p>
                  <p className="text-xs text-muted-foreground">
                    Rendered vs. penalty hours will plot here over time.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution & Popular Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={cardClass}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Event Types Distribution</h3>
                <p className="text-xs text-muted-foreground">Hover a slice to inspect event breakdown</p>
              </div>
            </div>
            <div className="h-64">
              {eventTypesChartData.length > 0 ? (
                <ChartContainer config={eventTypesChartConfig} className="h-full w-full aspect-auto">
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel nameKey="type" />}
                    />
                    <Pie
                      data={eventTypesChartData}
                      dataKey="count"
                      nameKey="type"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={3}
                      strokeWidth={2}
                      activeIndex={activeEventIndex}
                      activeShape={({ outerRadius = 0, ...props }) => (
                        <Sector {...props} outerRadius={outerRadius + 6} />
                      )}
                      onMouseEnter={(_, index) => setActiveEventIndex(index)}
                      onMouseLeave={() => setActiveEventIndex(-1)}
                    >
                      {eventTypesChartData.map((entry) => (
                        <Cell key={entry.type} fill={entry.fill} stroke="hsl(var(--card))" />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                            const activeItem =
                              activeEventIndex >= 0 ? eventTypesChartData[activeEventIndex] : null;
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  className="fill-foreground text-2xl font-bold tabular-nums"
                                >
                                  {activeItem ? activeItem.count : totalEventsCount}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 20}
                                  className="fill-muted-foreground text-xs"
                                >
                                  {activeItem ? activeItem.type : 'Total Events'}
                                </tspan>
                              </text>
                            );
                          }
                          return null;
                        }}
                      />
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="type" />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                  <PieChartIcon className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No events recorded yet</p>
                  <p className="text-xs text-muted-foreground">
                    Event breakdown by category will appear once events are created.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-5 sm:p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">Popular Tasks</h3>
            {topTasks.length > 0 ? (
              <div className="divide-y divide-border/70">
                {topTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center min-w-0 pr-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-primary/15 text-primary rounded-full text-xs font-medium mr-3 shrink-0 tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {task.hours_offered} hours offered
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <p className="text-sm font-medium text-foreground">{task.application_count} applications</p>
                      <p className="text-xs text-muted-foreground">
                        {task.completion_rate ? `${Math.round(task.completion_rate)}% completion` : 'No completions'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-2">
                <ClipboardList className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No task data available</p>
                <p className="text-xs text-muted-foreground">
                  Popular tasks will rank here as students apply.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
