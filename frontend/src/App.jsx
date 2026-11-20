import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';

import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard.jsx';
import AttendanceManagement from './components/Attendance/AttendanceManagement.jsx';
import EventCalendar from './components/Calendar/EventCalendar.jsx';
import AdminDashboard from './components/Dashboard/AdminDashboard.jsx';
import StudentDashboard from './components/Dashboard/StudentDashboard.jsx';
import MobileSidebar from './components/Layout/MobileSidebar.jsx';
import Sidebar from './components/Layout/Sidebar.jsx';
import TaskManagement from './components/Tasks/TaskManagement.jsx';
import UserManagement from './components/Users/UserManagement.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import './index.css';
import Settings from './components/Settings/Settings.jsx';

const MainApp = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('activeTab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  // Persist tab selection
  useEffect(() => {
    try { localStorage.setItem('activeTab', activeTab); } catch {}
  }, [activeTab]);

  // After login, force Dashboard once; on refresh stay where you are
  useEffect(() => {
    if (user) {
      try {
        const just = localStorage.getItem('justLoggedIn');
        if (just === '1') {
          setActiveTab('dashboard');
          localStorage.removeItem('justLoggedIn');
        }
      } catch {}
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (String(user.role || '').toUpperCase() === 'STUDENT') ? <StudentDashboard /> : <AdminDashboard />;
      case 'calendar':
        return <EventCalendar />;
      case 'events':
        return <EventCalendar />;
      case 'tasks':
        return <TaskManagement />;
      case 'attendance':
        return <AttendanceManagement />;
      case 'analytics':
        return (String(user.role || '').toUpperCase() === 'ADMIN')
          ? <AnalyticsDashboard />
          : <AdminDashboard />;
      case 'users':
        return <UserManagement />;
      case 'students':
        return (
          <Card>
            <CardContent>
              <h2 className="text-2xl font-bold text-foreground mb-4">Student Management</h2>
              <p className="text-muted-foreground">Student management features coming soon...</p>
            </CardContent>
          </Card>
        );

      case 'settings':
        return <Settings />;
      default:
        return (String(user.role || '').toUpperCase() === 'STUDENT') ? <StudentDashboard /> : <AdminDashboard />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      {/* Mobile Header and Sidebar */}
      <div className="lg:hidden">
        <MobileSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </Router>
  );
}

export default App;
