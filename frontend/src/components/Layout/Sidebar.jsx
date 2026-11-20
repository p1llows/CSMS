import axios from 'axios';
import { 
  Home, 
  Calendar, 
  Users, 
  ClipboardList, 
  BarChart3, 
  Settings,
  LogOut,
  CheckSquare
} from 'lucide-react';
import React, { useEffect, useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';

import { useAuth } from '../../context/AuthContext.jsx';
import { cn } from '../../lib/utils';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [taskBadge, setTaskBadge] = useState(0);
  const SEEN_KEY = 'task_seen_student_apps_v2';

  const formatDisplayName = (u) => {
    const raw = (u?.name || '').toString().trim();
    if (raw) {
      if (raw.includes(',')) {
        const [last, rest] = raw.split(',');
        const parts = (rest || '').trim().split(/\s+/).filter(Boolean);
        const first = parts[0] || '';
        return `${first} ${(last || '').trim()}`.replace(/\s+/g, ' ').trim();
      } else {
        const parts = raw.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0];
        const first = parts[0];
        const last = parts[parts.length - 1];
        return `${first} ${last}`.replace(/\s+/g, ' ').trim();
      }
    }
    return u?.email || 'User';
  };

  const loadSeenMap = () => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
      // migrate legacy array of ids to map with true
      if (Array.isArray(obj)) {
        const m = {};
        for (const id of obj) m[id] = true;
        return m;
      }
      return {};
    } catch { return {}; }
  };

  const saveSeenMap = (mapObj) => {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(mapObj || {})); } catch {}
  };

  const loadBadge = useCallback(async () => {
      try {
        const role = (user?.role || '').toString().toUpperCase();
        if (!role) return;
        if (role === 'STUDENT') {
          const res = await axios.get('/api/tasks/my-applications');
          const list = Array.isArray(res.data) ? res.data : [];
          const seenMap = loadSeenMap();
          const updated = list.filter(a => ['approved','rejected','completed'].includes((a.status || '').toLowerCase()));
          const unseenCount = updated.reduce((acc, a) => {
            const key = String(a.id);
            const seenVal = Number(seenMap[key] || 0);
            const updatedAtMs = a.updated_at ? Date.parse(a.updated_at) : 0;
            return acc + (seenVal === updatedAtMs ? 0 : 1);
          }, 0);
          setTaskBadge(unseenCount);
        } else {
          const res = await axios.get('/api/tasks/applications');
          const list = Array.isArray(res.data) ? res.data : [];
          const cnt = list.filter(a => (a.status || '').toLowerCase() === 'pending').length;
          setTaskBadge(cnt);
        }
      } catch (e) {
        setTaskBadge(0);
      }
  }, [user]);

  useEffect(() => { loadBadge(); }, [loadBadge]);

  // Allow other components to trigger refresh
  useEffect(() => {
    const handler = () => loadBadge();
    window.addEventListener('tasks:refresh', handler);
    window.addEventListener('focus', handler);
    return () => { window.removeEventListener('tasks:refresh', handler); window.removeEventListener('focus', handler); };
  }, [activeTab, loadBadge]);

  // Periodic polling to detect new notifications across users (simple fallback instead of websockets)
  useEffect(() => {
    const id = setInterval(() => { loadBadge(); }, 5000);
    return () => clearInterval(id);
  }, [loadBadge]);

  const getMenuItems = () => {
    if (user?.role === 'STUDENT') {
      // Students: also use combined Events and Calendar item
      return [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'events', label: 'Events and Calendar', icon: Calendar },
        { id: 'attendance', label: 'My Attendance', icon: CheckSquare },
        { id: 'tasks', label: 'Available Tasks', icon: ClipboardList },
      ];
    } else {
      // Admin/Faculty: combine Events and Calendar into one
      const items = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'events', label: 'Events and Calendar', icon: Calendar },
        { id: 'attendance', label: 'Attendance', icon: CheckSquare },
        { id: 'tasks', label: 'Tasks', icon: ClipboardList },
      ];
      const isAdmin = (user?.role || '').toString().toUpperCase() === 'ADMIN';
      // Show User Management only to Admins (insert before Tasks)
      if (isAdmin) {
        items.splice(3, 0, { id: 'users', label: 'User Management', icon: Users });
        // Analytics is Admin-only
        items.push({ id: 'analytics', label: 'Analytics', icon: BarChart3 });
      }
      return items;
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="bg-background border-r border-border h-screen w-64 shadow-sm flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-center mb-1">
          <img src="/logo.png" alt="CSMS Logo" className="h-28 w-auto object-contain" />
        </div>
        <h1 className="text-xl font-bold text-primary text-center">CSMS</h1>
        <p className="text-sm text-muted-foreground text-center">Community Service Monitor</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
            <span className="text-primary font-semibold">
              {((user?.name || '')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(w => w[0])
                .join('') || 'U').toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">
              {formatDisplayName(user)}
            </p>
            <p className="text-xs text-muted-foreground">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'w-full justify-start text-left rounded-none px-4 py-3 text-foreground',
                'hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-primary/10 text-primary border-r-2 border-primary'
              )}
              onClick={() => { setActiveTab(item.id); }}
            >
              <Icon className="w-5 h-5 mr-3" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'tasks' && taskBadge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                  {taskBadge}
                </span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-left rounded-none px-4 py-3 hover:bg-accent hover:text-accent-foreground"
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="w-5 h-5 mr-3" />
          <span>Settings</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-left rounded-none px-4 py-3 text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
          onClick={logout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
