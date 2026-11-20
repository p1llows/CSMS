import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';


import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAuth } from '../../context/AuthContext.jsx';

const Settings = () => {
  const { user, setUser } = useAuth();
  const role = useMemo(() => (user?.role || '').toString().toUpperCase(), [user]);

  const [profile, setProfile] = useState(() => ({ name: user?.name || '', email: user?.email || '' }));
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
    // Prefill from context on user change (e.g., right after login)
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
      setProfileSuccess('Saved');
    } catch (e) {
      setProfileError('Failed to save');
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
    } catch {
      setPwdError('Failed to update password');
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
    } catch {
      setAcadError('Failed to save');
    } finally {
      setSavingAcad(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground">Settings</h2>

      {/* Section: User Account + Profile card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div>
          <h3 className="text-lg font-semibold text-foreground">User Account</h3>
          <p className="text-sm text-muted-foreground mt-2">Update your name and email. Changes apply across the app.</p>
        </div>
        <div className="lg:col-span-2">
          <Card className="p-4 space-y-4 border border-border shadow-sm">
            <h3 className="text-base font-semibold">Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="name@example.com" />
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2 justify-end">
              <Button onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Update Profile'}
              </Button>
              {profileError && <span className="text-sm text-destructive">{profileError}</span>}
              {profileSuccess && <span className="text-sm text-green-600">{profileSuccess}</span>}
            </div>
          </Card>
        </div>
      </div>

      {/* Section: Login Credentials + Password card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Login Credentials</h3>
          <p className="text-sm text-muted-foreground mt-2">Change your password. Use 8–16 characters.</p>
        </div>
        <div className="lg:col-span-2">
          <Card className="p-4 space-y-4 border border-border shadow-sm">
            <h3 className="text-base font-semibold">Change Password</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Current Password</Label>
                <Input type="password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} placeholder="Current password" />
              </div>
              <div>
                <Label>New Password</Label>
                <Input type="password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} placeholder="New password" />
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input type="password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} placeholder="Confirm password" />
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2 justify-end">
              <Button onClick={changePassword} disabled={savingPwd}>
                {savingPwd ? 'Updating...' : 'Change Password'}
              </Button>
              {pwdError && <span className="text-sm text-destructive">{pwdError}</span>}
              {pwdSuccess && <span className="text-sm text-green-600">{pwdSuccess}</span>}
            </div>
          </Card>
        </div>
      </div>

      {role === 'ADMIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Academic Year</h3>
            <p className="text-sm text-muted-foreground">Configure the current academic year and term details.</p>
          </div>
          <div className="lg:col-span-2">
            <Card className="p-4 space-y-4 border border-border shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Academic Year</Label>
                  <Input value={acad.year} onChange={(e) => setAcad((p) => ({ ...p, year: e.target.value }))} placeholder="e.g. 2025-2026" />
                </div>
                <div>
                  <Label>Term/Semester</Label>
                  <Input value={acad.term} onChange={(e) => setAcad((p) => ({ ...p, term: e.target.value }))} placeholder="e.g. 1st Semester" />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={acad.start_date} onChange={(e) => setAcad((p) => ({ ...p, start_date: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">Optional</p>
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={acad.end_date} onChange={(e) => setAcad((p) => ({ ...p, end_date: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">Optional</p>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2 justify-end">
                <Button onClick={saveAcad} disabled={savingAcad}>{savingAcad ? 'Saving...' : 'Save Academic Year'}</Button>
                {acadError && <span className="text-sm text-destructive">{acadError}</span>}
                {acadSuccess && <span className="text-sm text-green-600">{acadSuccess}</span>}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
