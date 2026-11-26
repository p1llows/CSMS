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
    <div className="bg-card text-foreground border-r border-border h-screen w-64 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-5 py-5 border-b border-border flex items-center gap-3">
        <img src="/logo.png" alt="CSMS Logo" className="h-11 w-11 object-contain shrink-0" />
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-foreground leading-tight">CSMS</h1>
          <p className="text-xs text-muted-foreground truncate">Community Service Monitor</p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#F4B2D0]/30 dark:bg-primary/15 border border-[#F4B2D0]/70 dark:border-primary/25 rounded-full flex items-center justify-center shrink-0">
            <span className="text-[#E91890] dark:text-[#F4B2D0] text-xs font-semibold">
              {((user?.name || '')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(w => w[0])
                .join('') || 'U').toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {formatDisplayName(user)}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'w-full justify-start text-left rounded-lg px-3 py-2.5 h-10 text-sm font-medium text-muted-foreground transition-colors',
                'hover:bg-[#F4B2D0]/15 hover:text-foreground dark:hover:bg-accent',
                isActive && 'bg-gradient-to-r from-[#F4B2D0]/35 to-[#F4B2D0]/15 text-[#E91890] hover:from-[#F4B2D0]/40 hover:to-[#F4B2D0]/20 hover:text-[#E91890] dark:from-primary/20 dark:to-primary/10 dark:text-[#F4B2D0] dark:hover:text-[#F4B2D0] font-semibold border border-[#F4B2D0]/50 dark:border-primary/25 shadow-sm'
              )}
              onClick={() => { setActiveTab(item.id); }}
            >
              <Icon className="w-4 h-4 mr-3 shrink-0" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.id === 'tasks' && taskBadge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#E91890] text-white text-[11px] font-semibold">
                  {taskBadge}
                </span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-1">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-left rounded-lg px-3 py-2.5 h-10 text-sm font-medium text-muted-foreground',
            'hover:bg-[#F4B2D0]/15 hover:text-foreground dark:hover:bg-accent',
            activeTab === 'settings' && 'bg-gradient-to-r from-[#F4B2D0]/35 to-[#F4B2D0]/15 text-[#E91890] dark:from-primary/20 dark:to-primary/10 dark:text-[#F4B2D0] font-semibold border border-[#F4B2D0]/50 dark:border-primary/25'
          )}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="w-4 h-4 mr-3 shrink-0" />
          <span>Settings</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-left rounded-lg px-3 py-2.5 h-10 text-sm font-medium text-[#E91890] dark:text-[#F4B2D0] hover:text-[#B81070] dark:hover:text-white hover:bg-[#F4B2D0]/20 dark:hover:bg-primary/15"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-3 shrink-0" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
