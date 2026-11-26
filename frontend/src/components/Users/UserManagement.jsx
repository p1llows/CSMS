import axios from 'axios';
import { Plus, Pencil, Trash2, Search, Download, Upload, RefreshCw } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';


import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

import { useAuth } from '../../context/AuthContext.jsx';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'STUDENT',
  year_level: '',
  section: '',
  student_id: ''
};

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(initialForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', year_level: '', section: '' });
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  // Delete confirmation state
  const [showDelete, setShowDelete] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  // Notice dialog
  const [notice, setNotice] = useState({ open: false, title: '', message: '' });

  // Bulk upload state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);

  // Bulk sync state (replace student list)
  const [showBulkSync, setShowBulkSync] = useState(false);
  const [bulkSyncFile, setBulkSyncFile] = useState(null);
  const [bulkSyncUploading, setBulkSyncUploading] = useState(false);
  const [bulkSyncError, setBulkSyncError] = useState(null);
  const [bulkSyncResult, setBulkSyncResult] = useState(null);

  const isAdmin = useMemo(() => (user?.role || '').toString().toUpperCase() === 'ADMIN', [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/users', { params: { page: 1, limit: 1000 } });
      const data = res.data;
      const list = Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []);
      setUsers(list);
      if (!Array.isArray(list)) setError('Unexpected response from server.');
    } catch (err) {
      console.error('Failed to fetch users', err);
      setError(err?.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const onBulkFileChange = (e) => {
    setBulkError(null);
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setBulkFile(file);
  };

  const resetBulk = () => {
    setShowBulk(false);
    setBulkFile(null);
    setBulkError(null);
    setBulkResult(null);
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    try {
      if (!bulkFile) {
        setBulkError('Please choose an Excel file (.xlsx or .xls).');
        return;
      }
      setBulkUploading(true);
      setBulkError(null);
      const form = new FormData();
      form.append('file', bulkFile);
      const res = await axios.post('/api/users/bulk-upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBulkResult(res.data?.summary || res.data || null);
      await fetchUsers();
    } catch (err) {
      console.error('Bulk upload failed', err);
      setBulkError(err?.response?.data?.error || 'Failed to process bulk upload');
    } finally {
      setBulkUploading(false);
    }
  };

  const onBulkSyncFileChange = (e) => {
    setBulkSyncError(null);
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setBulkSyncFile(file);
  };

  const resetBulkSync = () => {
    setShowBulkSync(false);
    setBulkSyncFile(null);
    setBulkSyncError(null);
    setBulkSyncResult(null);
  };

  const submitBulkSync = async (e) => {
    e.preventDefault();
    try {
      if (!bulkSyncFile) {
        setBulkSyncError('Please choose an Excel file (.xlsx or .xls).');
        return;
      }
      setBulkSyncUploading(true);
      setBulkSyncError(null);
      const form = new FormData();
      form.append('file', bulkSyncFile);
      const res = await axios.post('/api/users/bulk-sync', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBulkSyncResult(res.data?.summary || res.data || null);
      await fetchUsers();
    } catch (err) {
      console.error('Bulk sync failed', err);
      setBulkSyncError(err?.response?.data?.error || 'Failed to process bulk sync');
    } finally {
      setBulkSyncUploading(false);
    }
  };

  const [roleFilter, setRoleFilter] = useState('ALL');

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = (users || []).filter((u) => {
      if (roleFilter !== 'ALL' && (u.role || '').toString().toUpperCase() !== roleFilter) {
        return false;
      }
      if (!term) return true;
      const name = (u.name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase();
      return (
        String(u.id).toLowerCase().includes(term) ||
        name.includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.role || '').toLowerCase().includes(term) ||
        String(u.yearLevel ?? u.year_level ?? '').toLowerCase().includes(term) ||
        String(u.section || u.yearSection || '').toLowerCase().includes(term)
      );
    });
    return [...base].sort((a, b) => Number(a.id) - Number(b.id));
  }, [users, search, roleFilter]);

  const resetCreate = () => {
    setCreateForm(initialForm);
    setCreateError(null);
    setShowCreate(false);
  };

  const onCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: value }));
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      setCreateError(null);
      // Split name into first/last
      const fullName = (createForm.name || '').trim();
      const [first, ...rest] = fullName.split(/\s+/);
      const first_name = first || '';
      const last_name = rest.join(' ') || '';
      if (!first_name || !last_name) {
        setCreateError('Please provide both first and last name.');
        setCreating(false);
        return;
      }

      const payload = {
        first_name,
        last_name,
        email: createForm.email,
        role: (createForm.role || 'STUDENT').toUpperCase(),
        section: createForm.role === 'STUDENT' && createForm.section ? createForm.section : undefined,
        year_level: createForm.role === 'STUDENT' && createForm.year_level ? Number(createForm.year_level) : undefined,
        password: createForm.password,
        student_id: createForm.role === 'STUDENT' && createForm.student_id ? createForm.student_id : undefined,
      };

      const res = await axios.post('/api/users', payload);
      const created = res.data?.user || null;
      if (created) {
        setUsers(prev => [created, ...prev]);
        resetCreate();
      } else {
        await fetchUsers();
        resetCreate();
      }
    } catch (err) {
      console.error('Create user failed', err);
      setCreateError(err?.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      name: (u.name || `${u.first_name || ''} ${u.last_name || ''}`).trim(),
      email: u.email || '',
      year_level: (u.yearLevel ?? u.year_level ?? '') || '',
      section: (u.section ?? u.yearSection ?? '') || ''
    });
    setShowEdit(true);
    setUpdateError(null);
  };

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const submitUpdate = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      setUpdating(true);
      setUpdateError(null);
      // Split name into first/last if provided
      const fullName = (editForm.name || '').trim();
      const [first, ...rest] = fullName.split(/\s+/);
      const first_name = first || '';
      const last_name = rest.join(' ') || '';
      const email = (editForm.email || '').trim();

      const payload = {
        year_level: editForm.year_level === '' ? null : Number(editForm.year_level),
        section: editForm.section === '' ? null : editForm.section,
        ...(fullName ? { first_name, last_name } : {}),
        ...(email ? { email } : {})
      };
      const res = await axios.put(`/api/users/${editUser.id}`, payload);
      const updated = res.data?.user || null;
      if (updated) {
        setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      } else {
        await fetchUsers();
      }
      setShowEdit(false);
      setEditUser(null);
    } catch (err) {
      console.error('Update user failed', err);
      setUpdateError(err?.response?.data?.error || 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const confirmAndDelete = async (u) => {
    try {
      await axios.delete(`/api/users/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (err) {
      setNotice({ open: true, title: 'Delete Failed', message: err?.response?.data?.error || 'Failed to delete user' });
    } finally {
      setShowDelete(false);
      setUserToDelete(null);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-2xl font-bold text-foreground mb-4">User Management</h2>
          <p className="text-muted-foreground">Only administrators can access this page.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground mb-1">
            Account Directory
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            User Management
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              const headers = ['ID', 'Name', 'Email', 'Role', 'Year Level', 'Section'];
              const rows = filteredUsers.map(u => [
                u.id,
                `"${(u.name || `${u.first_name || ''} ${u.last_name || ''}`).replace(/"/g, '""')}"`,
                `"${(u.email || '').replace(/"/g, '""')}"`,
                (u.role || '').toString().toUpperCase(),
                u.yearLevel ?? u.year_level ?? '',
                `"${(u.section ?? u.yearSection ?? '').replace(/"/g, '""')}"`,
              ].join(','));
              const csv = [headers.join(','), ...rows].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `csms-users-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            variant="outline"
            size="sm"
            className="rounded-full px-3.5 gap-1.5 border-border/80"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            onClick={() => setShowBulk(true)}
            variant="outline"
            size="sm"
            className="rounded-full px-3.5 gap-1.5 border-border/80"
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => setShowBulkSync(true)}
            variant="outline"
            size="sm"
            className="rounded-full px-3.5 gap-1.5 border-border/80"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Bulk Update
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            size="sm"
            className="rounded-full px-4 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="user-search"
            type="text"
            className="pl-9 rounded-xl bg-card"
            placeholder="Search by name, email, role, or section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="inline-flex items-center rounded-full bg-muted p-1">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'STUDENT', label: 'Students' },
              { id: 'FACULTY', label: 'Faculty' },
              { id: 'ADMIN', label: 'Admin' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  roleFilter === tab.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {filteredUsers.length} of {users.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <Card className="rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead className="w-16 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">ID</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Name</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Role</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Year</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Section</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading users...</TableCell>
                </TableRow>
              )}
              {error && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive py-8">{error}</TableCell>
                </TableRow>
              )}
              {!loading && !error && filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">No users match your filter.</TableCell>
                </TableRow>
              )}
              {!loading && !error && filteredUsers.map((u) => {
                const role = (u.role || '').toString().toUpperCase();
                const yearLevel = (u.yearLevel ?? u.year_level ?? null);
                const section = u.section ?? u.yearSection ?? '';
                const displayName = (u.name || `${u.first_name || ''} ${u.last_name || ''}`).trim();
                const initials = (displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('') || 'U').toUpperCase();
                const roleBadgeClass =
                  role === 'ADMIN'
                    ? 'bg-primary/15 text-primary'
                    : role === 'FACULTY'
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
                return (
                  <TableRow key={u.id} className="hover:bg-muted/35 transition-colors border-border/60">
                    <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">#{u.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                          {initials}
                        </span>
                        <span className="font-medium text-foreground">{displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${roleBadgeClass}`}>
                        {role}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{yearLevel ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{section || '—'}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {role === 'STUDENT' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(u)}
                            aria-label="Edit user"
                            title="Edit"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setUserToDelete(u); setShowDelete(true); }}
                          aria-label="Delete user"
                          title="Delete"
                          className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>Create a new user account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            {createError && <div className="text-red-600 text-sm">{createError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input name="name" value={createForm.name} onChange={onCreateChange} placeholder="First Last" required />
              </div>
              <div>
                <Label>Email/Username</Label>
                <Input type="email" name="email" value={createForm.email} onChange={onCreateChange} placeholder="name@example.com" required />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" name="password" value={createForm.password} onChange={onCreateChange} placeholder="******" required />
              </div>
              <div>
                <Label>Role</Label>
                <select name="role" value={createForm.role} onChange={onCreateChange} className="h-10 w-full rounded-md border border-input bg-background text-foreground px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="ADMIN">Admin</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
              <div>
                <Label>Year Level</Label>
                <Input type="number" min="1" max="10" name="year_level" value={createForm.year_level} onChange={onCreateChange} placeholder="e.g. 1, 2, 3" disabled={createForm.role !== 'STUDENT'} />
              </div>
              <div>
                <Label>Section</Label>
                <Input name="section" value={createForm.section} onChange={onCreateChange} placeholder="e.g. A, B" disabled={createForm.role !== 'STUDENT'} />
              </div>
              <div className="sm:col-span-2">
                <Label>School ID (optional)</Label>
                <Input name="student_id" value={createForm.student_id} onChange={onCreateChange} placeholder="e.g. 2025-001" disabled={createForm.role !== 'STUDENT'} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Account'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Update (Sync) Dialog */}
      <Dialog open={showBulkSync} onOpenChange={setShowBulkSync}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Update (Sync) Student Users</DialogTitle>
            <DialogDescription>
              This will <b>create or update</b> all students found in the uploaded Excel file and <b>delete</b> any existing student accounts that are <b>not</b> in the file. Proceed with caution.
              Expected columns: <b>Student Name</b>, <b>Section</b>, <b>Year Level</b>, <b>Email</b>, <b>Student ID Number</b>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBulkSync} className="space-y-4">
            {bulkSyncError && <div className="text-red-600 text-sm">{bulkSyncError}</div>}
            <div>
              <Label>Excel File</Label>
              <Input type="file" accept=".xlsx,.xls" onChange={onBulkSyncFileChange} />
              <p className="text-xs text-muted-foreground mt-1">Tip: Export your current list first for a template, then adjust.</p>
            </div>
            {bulkSyncResult && (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium mb-2">Summary</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Created: {bulkSyncResult.created || 0}</li>
                  <li>Updated: {bulkSyncResult.updated || 0}</li>
                  <li>Deleted: {bulkSyncResult.deleted || 0}</li>
                  <li>Not deleted (related records): {bulkSyncResult.notDeletedDueToRelations || 0}</li>
                  <li>Errors: {bulkSyncResult.errors || 0}</li>
                </ul>
                {Array.isArray(bulkSyncResult.details) && bulkSyncResult.details.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left">
                          <th className="py-1 pr-2">Row/ID</th>
                          <th className="py-1 pr-2">Status</th>
                          <th className="py-1 pr-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkSyncResult.details.slice(0, 50).map((d, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-1 pr-2">{d.row ?? d.id ?? '-'}</td>
                            <td className="py-1 pr-2">{d.status}</td>
                            <td className="py-1 pr-2">{d.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkSyncResult.details.length > 50 && (
                      <div className="text-muted-foreground mt-1">Showing first 50 entries…</div>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={resetBulkSync}>Close</Button>
              <Button type="submit" disabled={bulkSyncUploading} className="bg-destructive hover:bg-destructive/90">
                {bulkSyncUploading ? 'Syncing…' : 'Run Sync'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Upload Students</DialogTitle>
            <DialogDescription>
              Upload an Excel file (.xlsx or .xls) with the following columns: <b>Student Name</b>, <b>Section</b>, <b>Year Level</b>, <b>Email</b>, <b>Student ID Number</b>.
              The Student ID will also be set as the default password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBulk} className="space-y-4">
            {bulkError && <div className="text-red-600 text-sm">{bulkError}</div>}
            <div>
              <Label>Excel File</Label>
              <Input type="file" accept=".xlsx,.xls" onChange={onBulkFileChange} />
            </div>
            {bulkResult && (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium mb-2">Summary</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Created: {bulkResult.created || 0}</li>
                  <li>Skipped (duplicates): {bulkResult.skippedDuplicates || 0}</li>
                  <li>Errors: {bulkResult.errors || 0}</li>
                </ul>
                {Array.isArray(bulkResult.details) && bulkResult.details.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left">
                          <th className="py-1 pr-2">Row</th>
                          <th className="py-1 pr-2">Status</th>
                          <th className="py-1 pr-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResult.details.slice(0, 50).map((d, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-1 pr-2">{d.row}</td>
                            <td className="py-1 pr-2">{d.status}</td>
                            <td className="py-1 pr-2">{d.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkResult.details.length > 50 && (
                      <div className="text-muted-foreground mt-1">Showing first 50 entries…</div>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={resetBulk}>Close</Button>
              <Button type="submit" disabled={bulkUploading}>{bulkUploading ? 'Uploading…' : 'Upload'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update the student details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitUpdate} className="space-y-4">
            {updateError && <div className="text-red-600 text-sm">{updateError}</div>}
            <div>
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} placeholder="First Last" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} placeholder="name@example.com" />
            </div>
            <div>
              <Label>Year Level</Label>
              <Input type="number" min="1" max="4" value={editForm.year_level} onChange={(e) => setEditForm(prev => ({ ...prev, year_level: e.target.value }))} />
            </div>
            <div>
              <Label>Section</Label>
              <Input value={editForm.section} onChange={(e) => setEditForm(prev => ({ ...prev, section: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={updating}>{updating ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={(o) => { setShowDelete(o); if (!o) setUserToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account for {userToDelete?.name || userToDelete?.email}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => userToDelete && confirmAndDelete(userToDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notice Dialog */}
      <Dialog open={notice.open} onOpenChange={(o) => setNotice(prev => ({ ...prev, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{notice.title || 'Notice'}</DialogTitle>
            {notice.message && <DialogDescription>{notice.message}</DialogDescription>}
          </DialogHeader>
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => setNotice(prev => ({ ...prev, open: false }))}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
