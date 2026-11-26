import axios from 'axios';
import { 
  Home, 
  Calendar, 
  Users, 
  ClipboardList, 
  BarChart3, 
  Settings,
  LogOut,
  GraduationCap,
  Menu,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { useAuth } from '../../context/AuthContext.jsx';
import { cn } from '../../lib/utils';
import ThemeToggle from './ThemeToggle.jsx';

const MobileSidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [taskBadge, setTaskBadge] = useState(0);
  const SEEN_KEY = 'task_seen_student_apps_v2';
  const loadSeenMap = () => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
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

  useEffect(() => {
    const loadBadge = async () => {
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
            const seenVal = seenMap[key];
            const updatedAt = a.updated_at ? new Date(a.updated_at).toISOString() : '';
            return acc + (seenVal === updatedAt ? 0 : 1);
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
    };
    loadBadge();
    const handler = () => loadBadge();
    window.addEventListener('tasks:refresh', handler);
    const id = setInterval(loadBadge, 10000);
    return () => { window.removeEventListener('tasks:refresh', handler); clearInterval(id); };
  }, [user]);

  const getMenuItems = () => {
    if (user?.role === 'STUDENT') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'events', label: 'Events and Calendar', icon: Calendar },
        { id: 'attendance', label: 'My Attendance', icon: Users },
        { id: 'tasks', label: 'Available Tasks', icon: ClipboardList },
      ];
    } else {
      // Admin/Faculty combined item
      const items = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'events', label: 'Events and Calendar', icon: Calendar },
        { id: 'attendance', label: 'Attendance', icon: Users },
        { id: 'tasks', label: 'Tasks', icon: ClipboardList },
      ];
      const isAdmin = (user?.role || '').toString().toUpperCase() === 'ADMIN';
      if (isAdmin) {
        items.splice(3, 0, { id: 'users', label: 'User Management', icon: Users });
        // Analytics is Admin-only
        items.push({ id: 'analytics', label: 'Analytics', icon: BarChart3 });
      }
      return items;
    }
  };

  const menuItems = getMenuItems();

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // No auto-mark as seen here; Tasks page handles it per-tab
    setIsOpen(false);
  };
  // removed secondary effect; handled above with polling and event

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-card/90 backdrop-blur-md shadow-sm border-b border-border px-4 py-2.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-2.5">
          <img src="/logo.png" alt="CSMS Logo" className="h-9 w-9 object-contain" />
          <h1 className="text-base font-bold tracking-tight text-foreground">CSMS</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle className="h-9 w-9 rounded-lg" />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetHeader className="p-4 border-b border-border text-left">
              <SheetTitle className="flex items-center gap-2">
                <img src="/logo.png" alt="CSMS Logo" className="h-12 w-auto object-contain" />
                <span>CSMS</span>
              </SheetTitle>
            </SheetHeader>

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
            <nav className="flex-1 py-2 px-3 overflow-y-auto">
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
                    onClick={() => handleTabChange(item.id)}
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
                className="w-full justify-start rounded-none px-4 py-3 hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleTabChange('settings')}
              >
                <Settings className="w-5 h-5 mr-3" />
                <span>Settings</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-lg px-3 py-2.5 h-10 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                <span>Logout</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;
