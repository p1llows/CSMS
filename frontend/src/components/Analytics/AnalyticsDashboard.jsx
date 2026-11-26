import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Users, BadgeCheck, AlertTriangle, ClipboardList, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

import { Card, CardContent } from '@/components/ui/card';

import { useTheme } from '../../context/ThemeContext.jsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AnalyticsDashboard = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

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

  const tickColor = isDark ? 'rgba(226, 232, 240, 0.65)' : 'rgba(71, 85, 105, 0.8)';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.18)';

  const attendanceChartData = {
    labels: attendanceTrends.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Attendance Rate (%)',
        data: attendanceTrends.map(item =>
          item.total_expected > 0 ? (item.present_count / item.total_expected * 100).toFixed(1) : 0
        ),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.35,
      },
    ],
  };

  const serviceHoursChartData = {
    labels: serviceHoursTrends.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Hours Rendered',
        data: serviceHoursTrends.map(item => item.hours_rendered || 0),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 6,
      },
      {
        label: 'Penalty Hours',
        data: serviceHoursTrends.map(item => item.penalty_hours || 0),
        backgroundColor: 'rgba(244, 63, 94, 0.85)',
        borderRadius: 6,
      },
    ],
  };

  const eventTypesChartData = {
    labels: eventTypes.map(item => item.type),
    datasets: [
      {
        data: eventTypes.map(item => item.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(244, 63, 94, 0.85)',
          'rgba(139, 92, 246, 0.85)',
          'rgba(236, 72, 153, 0.85)',
        ],
        borderWidth: 2,
        borderColor: isDark ? '#0f172a' : '#fff',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: tickColor, usePointStyle: true, boxWidth: 8 },
      },
    },
    scales: {
      x: {
        ticks: { color: tickColor },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: tickColor },
        grid: { color: gridColor },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'right',
        labels: { color: tickColor, usePointStyle: true, boxWidth: 8 },
      },
    },
  };

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
            <h3 className="text-base font-semibold text-foreground mb-4">Attendance Trends</h3>
            <div className="h-64">
              {attendanceTrends.length > 0 ? (
                <Line data={attendanceChartData} options={chartOptions} />
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
            <h3 className="text-base font-semibold text-foreground mb-4">Service Hours Trends</h3>
            <div className="h-64">
              {serviceHoursTrends.length > 0 ? (
                <Bar data={serviceHoursChartData} options={chartOptions} />
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
            <h3 className="text-base font-semibold text-foreground mb-4">Event Types Distribution</h3>
            <div className="h-64">
              {eventTypes.length > 0 ? (
                <Doughnut data={eventTypesChartData} options={doughnutOptions} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                  <PieChart className="w-8 h-8 text-muted-foreground/40" />
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
