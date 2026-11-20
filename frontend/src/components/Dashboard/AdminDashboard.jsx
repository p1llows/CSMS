import axios from 'axios';
import { Users, Calendar, ClipboardList, TrendingUp, AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import { useAuth } from '../../context/AuthContext.jsx';


const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { totalStudents, totalEvents, upcomingEvents, recentTasks, attendanceStats, serviceHoursStats } = dashboardData || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold text-foreground">{totalStudents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold text-foreground">{attendanceStats?.attendanceRate || 0}%</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold text-foreground">{totalEvents || 0}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Highest Penalty</p>
                <p className="text-2xl font-bold text-foreground">{serviceHoursStats?.highestPenalty || 0}</p>
                {serviceHoursStats?.highestPenaltyUserName && (
                  <p className="text-xs text-muted-foreground">by {serviceHoursStats.highestPenaltyUserName}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Overview - Last Event */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-foreground">Attendance Overview</h3>
            <span className="text-sm text-muted-foreground">
              {attendanceStats?.lastEventName ? (
                <>
                  {attendanceStats.lastEventName}
                  {attendanceStats?.lastEventType && String(attendanceStats.lastEventType).toUpperCase() === 'FRC' && (
                    <Badge variant="secondary" className="ml-2 align-middle">FRC</Badge>
                  )}
                </>
              ) : 'No past events'}
            </span>
          </div>
          {attendanceStats?.lastEventDate && (
            <p className="text-xs text-muted-foreground mb-4">
              {new Date(attendanceStats.lastEventDate).toLocaleDateString()}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{attendanceStats?.present || 0}</div>
              <div className="text-sm text-muted-foreground">Present</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{attendanceStats?.absent || 0}</div>
              <div className="text-sm text-muted-foreground">Absent</div>
            </div>
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

        {/* Recent Tasks */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Recent Tasks</h3>
              <ClipboardList className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {recentTasks?.length > 0 ? (
                recentTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-sm text-muted-foreground">By {task.created_by_name}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium text-foreground">{task.hours_offered}h</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === 'open' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No recent tasks</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
