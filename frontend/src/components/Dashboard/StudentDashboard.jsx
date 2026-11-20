import axios from 'axios';
import { Clock, Calendar, CheckCircle, AlertCircle, Users, XCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Card, CardContent } from '@/components/ui/card';

import { useAuth } from '../../context/AuthContext.jsx';


const StudentDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh when window regains focus
    const onFocus = () => fetchDashboardData();
    window.addEventListener('focus', onFocus);

    // Periodic refresh to keep values in sync with Attendance/Tasks updates
    const intervalId = setInterval(fetchDashboardData, 10000); // 10s

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { serviceHours, upcomingEvents, availableTasks, recentAttendance, attendanceSummary } = dashboardData || {};
  const rendered = Number(serviceHours?.rendered || 0);
  const penalty = Number(serviceHours?.penalty || 0);
  const remaining = penalty - rendered;
  const recentAttendanceSorted = (recentAttendance || []).slice().sort((a, b) => {
    const da = a?.event_date ? new Date(a.event_date) : new Date(0);
    const db = b?.event_date ? new Date(b.event_date) : new Date(0);
    return db - da; // descending by event_date
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
      </div>
      {/* Service Hours Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Hours Rendered</p>
                <p className="text-2xl font-bold text-foreground">{rendered}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Absents</p>
                <p className="text-2xl font-bold text-foreground">{attendanceSummary?.totalAbsents || 0}</p>
                <p className="text-xs text-muted-foreground">Rate: {attendanceSummary?.attendanceRate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Penalty Hours</p>
                <p className="text-2xl font-bold text-foreground">{penalty}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Remaining Hours</p>
                <p className="text-2xl font-bold text-foreground">{remaining}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Service Hours Progress</h3>
          <div className="w-full bg-accent rounded-full h-4">
          <div 
            className="bg-primary h-4 rounded-full transition-all duration-300"
            style={{ 
              width: `${Math.min(100, (penalty > 0 ? (rendered / penalty) * 100 : 0))}%` 
            }}
          ></div>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>{rendered} Hours Completed</span>
            <span>{penalty} Penalty Hours</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Upcoming Events</h3>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {upcomingEvents?.length > 0 ? (
                upcomingEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{event.name}</p>
                      <p className="text-sm text-muted-foreground">{event.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(event.event_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{event.start_time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No upcoming events</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Tasks */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Available Tasks</h3>
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {availableTasks?.length > 0 ? (
                availableTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.hours_offered} hours</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {task.max_participants ? `${task.max_participants - (task.current_participants || 0)} slots` : 'Open'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No available tasks</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Attendance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-accent">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {recentAttendanceSorted?.length > 0 ? (
                recentAttendanceSorted.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">{record.event_name}</div>
                        <div className="text-sm text-muted-foreground">{record.type}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {new Date(record.event_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const norm = (record.status || '').toString().toLowerCase();
                        const isPresent = norm === 'present';
                        const isAbsent = norm === 'absent';
                        const cls = isPresent
                          ? 'bg-green-100 text-green-800'
                          : isAbsent
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800';
                        const Icon = isPresent ? CheckCircle : (isAbsent ? XCircle : XCircle);
                        const label = isPresent ? 'Present' : (isAbsent ? 'Absent' : 'Unknown');
                        return (
                          <span className={`inline-flex items-center px-2 py-1 text-xs font rounded-full ${cls}`}>
                            <Icon className="w-3 h-3 mr-1" /> {label}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-muted-foreground">
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
