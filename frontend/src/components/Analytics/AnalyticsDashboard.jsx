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
import { Calendar, TrendingUp, Users, Clock, BadgeCheck, AlertTriangle, ClipboardList } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const { attendanceTrends, serviceHoursTrends, eventTypes, topTasks, summary, overallAttendanceRate, engagementRate, frcComplianceRate, taskFulfillmentRate, penaltyStudentsCount } = analyticsData || {};

  const attendanceChartData = {
    labels: attendanceTrends?.map(item => new Date(item.date).toLocaleDateString()) || [],
    datasets: [
      {
        label: 'Attendance Rate (%)',
        data: attendanceTrends?.map(item => 
          item.total_expected > 0 ? (item.present_count / item.total_expected * 100).toFixed(1) : 0
        ) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const serviceHoursChartData = {
    labels: serviceHoursTrends?.map(item => new Date(item.date).toLocaleDateString()) || [],
    datasets: [
      {
        label: 'Hours Rendered',
        data: serviceHoursTrends?.map(item => item.hours_rendered || 0) || [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
      {
        label: 'Penalty Hours',
        data: serviceHoursTrends?.map(item => item.penalty_hours || 0) || [],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
    ],
  };

  const eventTypesChartData = {
    labels: eventTypes?.map(item => item.type) || [],
    datasets: [
      {
        data: eventTypes?.map(item => item.count) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground">Analytics & Reports</h2>
        <div className="text-sm text-muted-foreground">All-time</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Student Engagement Rate</p>
                <p className="text-2xl font-bold text-foreground">{typeof engagementRate === 'number' ? engagementRate : 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <BadgeCheck className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">FRC Compliance Rate</p>
                <p className="text-2xl font-bold text-foreground">{typeof frcComplianceRate === 'number' ? frcComplianceRate : 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ClipboardList className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Task Fulfillment Rate</p>
                <p className="text-2xl font-bold text-foreground">{typeof taskFulfillmentRate === 'number' ? taskFulfillmentRate : 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Students With Penalty</p>
                <p className="text-2xl font-bold text-foreground">{typeof penaltyStudentsCount === 'number' ? penaltyStudentsCount : 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Attendance Trends</h3>
            <div className="h-64">
              <Line data={attendanceChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Service Hours Trends</h3>
            <div className="h-64">
              <Bar data={serviceHoursChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Event Types Distribution</h3>
            <div className="h-64">
              <Doughnut data={eventTypesChartData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Popular Tasks</h3>
            <div className="space-y-3">
              {topTasks?.length > 0 ? (
                topTasks.map((task, index) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <div className="flex items-center">
                      <span className="flex items-center justify-center w-6 h-6 bg-primary/20 text-primary rounded-full text-sm font-medium mr-3">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.hours_offered} hours offered</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{task.application_count} applications</p>
                      <p className="text-xs text-muted-foreground">
                        {task.completion_rate ? `${Math.round(task.completion_rate)}% completion` : 'No completions'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No task data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
