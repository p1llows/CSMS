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
import TopBar from './components/Layout/TopBar.jsx';
import TaskManagement from './components/Tasks/TaskManagement.jsx';
import UserManagement from './components/Users/UserManagement.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    const isStudent = String(user.role || '').toUpperCase() === 'STUDENT';
    switch (activeTab) {
      case 'dashboard':
        return isStudent
          ? <StudentDashboard onNavigate={setActiveTab} />
          : <AdminDashboard onNavigate={setActiveTab} />;
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
          : <AdminDashboard onNavigate={setActiveTab} />;
      case 'users':
      case 'students':
        return <UserManagement />;
      case 'settings':
        return <Settings />;
      default:
        return isStudent
          ? <StudentDashboard onNavigate={setActiveTab} />
          : <AdminDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background text-foreground">
      {/* Mobile Header and Sidebar */}
      <div className="lg:hidden">
        <MobileSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar activeTab={activeTab} />
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
