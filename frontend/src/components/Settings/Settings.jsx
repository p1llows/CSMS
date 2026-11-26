import axios from 'axios';
import { Monitor, Moon, Sun, Check } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

const Settings = () => {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const role = useMemo(() => (user?.role || '').toString().toUpperCase(), [user]);

  const [profile, setProfile] = useState(() => ({ name: user?.name || '', email: user?.email || '' }));
  const [meMeta, setMeMeta] = useState({ schoolId: user?.schoolId || '', yearSection: user?.yearSection || '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState('');

  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState(null);
  const [pwdSuccess, setPwdSuccess] = useState('');

  const [acad, setAcad] = useState({ year: '', term: '', start_date: '', end_date: '' });
  const [savingAcad, setSavingAcad] = useState(false);
  const [acadError, setAcadError] = useState(null);
  const [acadSuccess, setAcadSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        name: (prev?.name && prev.name.trim().length > 0) ? prev.name : (user.name || ''),
        email: (prev?.email && prev.email.trim().length > 0) ? prev.email : (user.email || ''),
      }));
    }
  }, [user]);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await axios.get('/api/me');
        const me = res.data || {};
        setProfile({ name: me.name || '', email: me.email || '' });
        setMeMeta({ schoolId: me.schoolId || '', yearSection: me.yearSection || '' });
      } catch {}
    };
    loadMe();
  }, []);

  useEffect(() => {
    const loadAcad = async () => {
      if (role !== 'ADMIN') return;
      try {
        const res = await axios.get('/api/settings/academic-year');
        const s = res.data || {};
        setAcad({
          year: s.year || '',
          term: s.term || '',
          start_date: s.start_date ? s.start_date.slice(0, 10) : '',
          end_date: s.end_date ? s.end_date.slice(0, 10) : ''
        });
      } catch {}
    };
    loadAcad();
  }, [role]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess('');
    try {
      const payload = { name: profile.name, email: profile.email };
      const res = await axios.put('/api/me', payload);
      const updated = res.data || payload;
      setProfile({ name: updated.name || payload.name, email: updated.email || payload.email });
      try { setUser && setUser((prev) => ({ ...(prev || {}), name: updated.name, email: updated.email })); } catch {}
      setProfileSuccess('Profile updated');
    } catch (e) {
      setProfileError(e?.response?.data?.error || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!pwd.next || pwd.next !== pwd.confirm) {
      setPwdError('Passwords do not match');
      return;
    }
    setSavingPwd(true);
    setPwdError(null);
    setPwdSuccess('');
    try {
      await axios.put('/api/me/password', { current: pwd.current, next: pwd.next });
      setPwd({ current: '', next: '', confirm: '' });
      setPwdSuccess('Password updated');
    } catch (e) {
      setPwdError(e?.response?.data?.error || 'Failed to update password');
    } finally {
      setSavingPwd(false);
    }
  };

  const saveAcad = async () => {
    setSavingAcad(true);
    setAcadError(null);
    setAcadSuccess('');
    try {
      const payload = {
        year: acad.year,
        term: acad.term || undefined,
        start_date: acad.start_date || undefined,
        end_date: acad.end_date || undefined,
      };
      await axios.put('/api/settings/academic-year', payload);
      setAcadSuccess('Saved');
      window.dispatchEvent(new Event('settings:academic-updated'));
    } catch (e) {
      setAcadError(e?.response?.data?.error || 'Failed to save academic year');
    } finally {
      setSavingAcad(false);
    }
  };

  const initials = (
    (profile.name || user?.name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('') || 'U'
  ).toUpperCase();

  const cardClass =
    'p-5 sm:p-6 space-y-5 rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.03)] dark:shadow-none';

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground mb-1">
          Account &amp; Preferences
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h2>
      </div>

      {/* Section: Appearance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div>
          <h3 className="text-base font-semibold text-foreground">Appearance</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how CSMS looks on your device.
          </p>
        </div>
        <div className="lg:col-span-2">
          <Card className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Theme</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Switch between light, dark, or match your system.
                </p>
              </div>
              <div className="inline-flex items-center rounded-full bg-muted p-1">
                {[
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'system', label: 'System', icon: Monitor },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTheme(opt.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        active
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Section: User Account + Profile card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pt-6 border-t border-border/60">
        <div>
          <h3 className="text-base font-semibold text-foreground">User Account</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Update your name and email. Changes apply across the app.
          </p>
        </div>
        <div className="lg:col-span-2">
          <Card className={cardClass}>
            <div className="flex items-center gap-3.5 pb-4 border-b border-border/60">
              <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {profile.name || 'User'}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground">
                    {role}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {meMeta.schoolId ? `ID ${meMeta.schoolId}` : profile.email}
                  {meMeta.yearSection ? ` · Section ${meMeta.yearSection}` : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name</Label>
                <Input
                  className="rounded-xl"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</Label>
                <Input
                  type="email"
                  className="rounded-xl"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs">
                {profileError && <span className="text-destructive">{profileError}</span>}
                {profileSuccess && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" /> {profileSuccess}
                  </span>
                )}
              </div>
              <Button onClick={saveProfile} disabled={savingProfile} size="sm" className="rounded-full px-5">
                {savingProfile ? 'Saving...' : 'Update Profile'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Section: Login Credentials + Password card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pt-6 border-t border-border/60">
        <div>
          <h3 className="text-base font-semibold text-foreground">Login Credentials</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Change your password. Use at least 8 characters.
          </p>
        </div>
        <div className="lg:col-span-2">
          <Card className={cardClass}>
            <h4 className="text-sm font-semibold text-foreground">Change Password</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Current Password</Label>
                <Input
                  type="password"
                  className="rounded-xl"
                  value={pwd.current}
                  onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                  placeholder="Current password"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">New Password</Label>
                <Input
                  type="password"
                  className="rounded-xl"
                  value={pwd.next}
                  onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                  placeholder="New password"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Confirm New Password</Label>
                <Input
                  type="password"
                  className="rounded-xl"
                  value={pwd.confirm}
                  onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder="Confirm password"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs">
                {pwdError && <span className="text-destructive">{pwdError}</span>}
                {pwdSuccess && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" /> {pwdSuccess}
                  </span>
                )}
              </div>
              <Button onClick={changePassword} disabled={savingPwd} size="sm" className="rounded-full px-5">
                {savingPwd ? 'Updating...' : 'Change Password'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {role === 'ADMIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pt-6 border-t border-border/60">
          <div>
            <h3 className="text-base font-semibold text-foreground">Academic Year</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Configure the active academic year and term shown across the system.
            </p>
          </div>
          <div className="lg:col-span-2">
            <Card className={cardClass}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Academic Year</Label>
                  <Input
                    className="rounded-xl"
                    value={acad.year}
                    onChange={(e) => setAcad((p) => ({ ...p, year: e.target.value }))}
                    placeholder="e.g. 2025-2026"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Term / Semester</Label>
                  <Input
                    className="rounded-xl"
                    value={acad.term}
                    onChange={(e) => setAcad((p) => ({ ...p, term: e.target.value }))}
                    placeholder="e.g. 1st Semester"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Start Date (Optional)</Label>
                  <Input
                    type="date"
                    className="rounded-xl"
                    value={acad.start_date}
                    onChange={(e) => setAcad((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">End Date (Optional)</Label>
                  <Input
                    type="date"
                    className="rounded-xl"
                    value={acad.end_date}
                    onChange={(e) => setAcad((p) => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-xs">
                  {acadError && <span className="text-destructive">{acadError}</span>}
                  {acadSuccess && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="w-3.5 h-3.5" /> {acadSuccess}
                    </span>
                  )}
                </div>
                <Button onClick={saveAcad} disabled={savingAcad} size="sm" className="rounded-full px-5">
                  {savingAcad ? 'Saving...' : 'Save Academic Year'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
