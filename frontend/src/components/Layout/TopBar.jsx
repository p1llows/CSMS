import axios from 'axios';
import { CalendarDays } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';

import { useAuth } from '../../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const TAB_TITLES = {
  dashboard: 'Dashboard',
  events: 'Events & Calendar',
  calendar: 'Events & Calendar',
  attendance: 'Attendance',
  users: 'User Management',
  students: 'User Management',
  tasks: 'Tasks',
  analytics: 'Analytics',
  settings: 'Settings',
};

const TopBar = ({ activeTab }) => {
  const { user } = useAuth();
  const [academicYear, setAcademicYear] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadAcad = async () => {
      try {
        const res = await axios.get('/api/settings/academic-year');
        if (mounted && res.data?.year) {
          setAcademicYear(res.data);
        }
      } catch {}
    };
    loadAcad();
    const onUpdated = () => loadAcad();
    window.addEventListener('settings:academic-updated', onUpdated);
    return () => {
      mounted = false;
      window.removeEventListener('settings:academic-updated', onUpdated);
    };
  }, []);

  const title = TAB_TITLES[activeTab] || 'Dashboard';
  const roleLabel = (user?.role || '').toString().toUpperCase();

  return (
    <header className="hidden lg:flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-md px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight text-foreground">{title}</h1>
        {academicYear?.year && (
          <Badge variant="secondary" className="font-normal gap-1.5 text-xs border-0">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              AY {academicYear.year}
              {academicYear.term ? ` · ${academicYear.term}` : ''}
            </span>
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle className="h-8 w-8 rounded-full hover:bg-muted" />
        {roleLabel && (
          <span className="inline-flex items-center h-7 px-3 rounded-full bg-muted text-muted-foreground text-[11px] font-medium tracking-wider">
            {roleLabel}
          </span>
        )}
      </div>
    </header>
  );
};

export default TopBar;
