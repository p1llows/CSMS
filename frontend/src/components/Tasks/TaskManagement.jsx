import axios from 'axios';
import { Plus, Users, Clock, MapPin, Calendar, CheckCircle, X, Edit, Trash2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '../../context/AuthContext.jsx';

const TaskManagement = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const [tasks, setTasks] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [adminApplications, setAdminApplications] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState(role === 'STUDENT' ? 'available' : 'all');
  // Confirmations
  const [showDeleteTask, setShowDeleteTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [applicationToWithdraw, setApplicationToWithdraw] = useState(null);
  const [applyingIds, setApplyingIds] = useState({});
  // Notification dialog (shadcn Dialog)
  const [notice, setNotice] = useState({ open: false, title: '', message: '' });
  // Notifications / badges
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

  useEffect(() => {
    fetchTasks();
    if (role === 'STUDENT') {
      fetchMyApplications();
    } else if (role === 'ADMIN' || role === 'FACULTY') {
      fetchAdminApplications();
    }
  }, [role, activeTab]);

  // When student views Applications/My Tasks, mark current approved/rejected/completed as seen (store last updated_at)
  useEffect(() => {
    if (role !== 'STUDENT') return;
    if (!['applications', 'mytasks'].includes(activeTab)) return;
    const map = loadSeenMap();
    for (const a of myApplications) {
      const st = (a.status || '').toLowerCase();
      if (st === 'approved' || st === 'rejected' || st === 'completed') {
        map[String(a.id)] = a.updated_at ? Date.parse(a.updated_at) : 0;
      }
    }
    saveSeenMap(map);
    // notify sidebar to refresh badge
    try { window.dispatchEvent(new Event('tasks:refresh')); } catch {}
  }, [activeTab, role, myApplications]);

  // Ensure correct default tab after user loads
  useEffect(() => {
    if (!user) return;
    setActiveTab(prev => {
      if (role === 'STUDENT' && ['available', 'applications', 'mytasks'].includes(prev)) return prev;
      if (role !== 'STUDENT' && ['all', 'available', 'applications'].includes(prev)) return prev;
      return role === 'STUDENT' ? 'available' : 'all';
    });
  }, [role, user]);

  const fetchTasks = async () => {
    try {
      const params = activeTab === 'available' ? { available: 'true' } : {};
      const response = await axios.get('/api/tasks', { params });
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRenderedHours = (a) => {
    if (!a) return null;
    const getNestedNumber = (obj, path) => {
      const parts = path.split('.');
      let cur = obj;
      for (const part of parts) {
        if (cur == null) return null;
        cur = cur[part];
      }
      if (cur === undefined || cur === null || cur === '') return null;
      const n = Number(cur);
      return (!Number.isNaN(n) && Number.isFinite(n)) ? n : null;
    };

    const paths = [
      'hours_rendered',
      'hoursRendered',
      'rendered_hours',
      'renderedHours',
      'total_hours',
      'totalHours',
      'hours',
      'report.hours_rendered',
      'report.rendered_hours',
      'report.hours',
      'completion.hours_rendered',
      'completion.rendered_hours',
      'completion.hours',
      'verification.hours_rendered',
      'verification.rendered_hours',
      'verification.hours',
    ];
    let found = null;
    for (const p of paths) {
      const n = getNestedNumber(a, p);
      if (n !== null) { found = n; break; }
    }
    const isCompleted = String(a.status || '').toLowerCase() === 'completed';
    const offered = getNestedNumber(a, 'hours_offered') ?? getNestedNumber(a, 'hoursOffered');
    if (isCompleted) {
      // If rendered is missing or zero, prefer offered hours when available
      if (found === null || found === 0) {
        if (offered !== null && offered > 0) return offered;
        // hide instead of showing 0h
        return null;
      }
      return found;
    }
    return found;
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      fetchTasks();
      if (activeTab === 'applications' && (role === 'ADMIN' || role === 'FACULTY')) {
        fetchAdminApplications();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      setNotice({ open: true, title: 'Delete Failed', message: error?.response?.data?.error || 'Failed to delete task' });
    } finally {
      setShowDeleteTask(false);
      setTaskToDelete(null);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const response = await axios.get('/api/tasks/my-applications');
      setMyApplications(response.data);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  };

  const fetchAdminApplications = async () => {
    try {
      const response = await axios.get('/api/tasks/applications');
      setAdminApplications(response.data);
    } catch (error) {
      console.error('Failed to fetch admin applications:', error);
    }
  };

  const applyForTask = async (taskId) => {
    try {
      setApplyingIds(prev => ({ ...prev, [taskId]: true }));
      await axios.post(`/api/tasks/${taskId}/apply`);
      // Success: refresh data and give quick feedback
      await Promise.all([fetchTasks(), fetchMyApplications()]);
      // notify badges to refresh
      try { window.dispatchEvent(new Event('tasks:refresh')); } catch {}
      setNotice({ open: true, title: 'Application Submitted', message: 'Application submitted. You can track it under My Applications.' });
    } catch (error) {
      console.error('Failed to apply for task:', error);
      setNotice({ open: true, title: 'Apply Failed', message: error?.response?.data?.error || 'Failed to apply for task' });
    } finally {
      setApplyingIds(prev => { const next = { ...prev }; delete next[taskId]; return next; });
    }
  };

  const withdrawApplication = async (applicationId) => {
    try {
      await axios.delete(`/api/tasks/applications/${applicationId}`);
      fetchTasks();
      fetchMyApplications();
    } catch (error) {
      console.error('Failed to withdraw application:', error);
      setNotice({ open: true, title: 'Withdraw Failed', message: error?.response?.data?.error || 'Failed to withdraw' });
    } finally {
      setShowWithdrawConfirm(false);
      setApplicationToWithdraw(null);
    }
  };

  const updateApplicationStatus = async (applicationId, status, hoursRendered, remarks) => {
    try {
      await axios.put(`/api/tasks/applications/${applicationId}`, {
        status,
        hoursRendered: status === 'completed' ? (Number(hoursRendered) || 0) : undefined,
        remarks
      });
      fetchAdminApplications();
      // Also refresh tasks to reflect updated participant counts
      fetchTasks();
      try { window.dispatchEvent(new Event('tasks:refresh')); } catch {}
    } catch (error) {
      console.error('Failed to update application:', error);
      setNotice({ open: true, title: 'Update Failed', message: error?.response?.data?.error || 'Failed to update' });
    }
  };

  const TaskModal = () => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      hoursOffered: 1,
      maxParticipants: 1,
      location: '',
      taskDate: '',
      startTime: '',
      endTime: ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const payload = {
          title: formData.title,
          description: formData.description || undefined,
          hoursOffered: Number(formData.hoursOffered) || 1,
          maxParticipants: Number(formData.maxParticipants) || 1,
          location: formData.location || undefined,
          taskDate: formData.taskDate || undefined,
          startTime: formData.startTime || undefined,
          endTime: formData.endTime || undefined,
        };
        await axios.post('/api/tasks', payload);
        fetchTasks();
        setShowTaskModal(false);
        setFormData({
          title: '',
          description: '',
          hoursOffered: 1,
          maxParticipants: 1,
          location: '',
          taskDate: '',
          startTime: '',
          endTime: ''
        });
      } catch (error) {
        console.error('Failed to create task:', error);
      }
    };

    return (
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Provide task details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-1 inline-block">Task Title</Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

      {/* Info Dialog */}
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

            <div>
              <Label className="mb-1 inline-block">Description (optional)</Label>
              <textarea
                className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 inline-block">Hours Offered</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.hoursOffered}
                  onChange={(e) => setFormData({...formData, hoursOffered: parseInt(e.target.value)})}
                  required
                />
              </div>
              <div>
                <Label className="mb-1 inline-block">Max Participants</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({...formData, maxParticipants: parseInt(e.target.value)})}
                  required
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 inline-block">Location</Label>
              <Input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>

            <div>
              <Label className="mb-1 inline-block">Task Date</Label>
              <Input
                type="date"
                value={formData.taskDate}
                onChange={(e) => setFormData({...formData, taskDate: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 inline-block">Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                />
              </div>
              <div>
                <Label className="mb-1 inline-block">End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowTaskModal(false)}>Cancel</Button>
              <Button type="submit">Create Task</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  const EditTaskModal = ({ task }) => {
    const [formData, setFormData] = useState({
      title: task.title || '',
      description: task.description || '',
      hoursOffered: task.hours_offered || 1,
      maxParticipants: task.max_participants || 1,
      location: task.location || '',
      taskDate: task.task_date ? new Date(task.task_date).toISOString().slice(0, 10) : '',
      startTime: task.start_time || '',
      endTime: task.end_time || '',
      status: task.status || 'open',
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const payload = {
          title: formData.title,
          description: formData.description,
          hoursOffered: Number(formData.hoursOffered) || 1,
          maxParticipants: Number(formData.maxParticipants) || 1,
          location: formData.location || undefined,
          taskDate: formData.taskDate || undefined,
          startTime: formData.startTime || undefined,
          endTime: formData.endTime || undefined,
          status: formData.status,
        };
        await axios.put(`/api/tasks/${task.id}`, payload);
        fetchTasks();
        setShowEditModal(false);
        setEditingTask(null);
      } catch (error) {
        console.error('Failed to update task:', error);
        setNotice({ open: true, title: 'Update Failed', message: error?.response?.data?.error || 'Failed to update task' });
      }
    };

    return (
      <Dialog open={showEditModal} onOpenChange={(open) => { setShowEditModal(open); if (!open) setEditingTask(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update the task details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-1 inline-block">Task Title</Label>
              <Input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>
            <div>
              <Label className="mb-1 inline-block">Description</Label>
              <textarea className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2" rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 inline-block">Hours Offered</Label>
                <Input type="number" min="1" value={formData.hoursOffered} onChange={(e) => setFormData({ ...formData, hoursOffered: parseInt(e.target.value) })} required />
              </div>
              <div>
                <Label className="mb-1 inline-block">Max Participants</Label>
                <Input type="number" min="1" value={formData.maxParticipants} onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })} required />
              </div>
            </div>
            <div>
              <Label className="mb-1 inline-block">Location</Label>
              <Input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 inline-block">Task Date</Label>
              <Input type="date" value={formData.taskDate} onChange={(e) => setFormData({ ...formData, taskDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 inline-block">Start Time</Label>
                <Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 inline-block">End Time</Label>
                <Input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1 inline-block">Status</Label>
              <select className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => { setShowEditModal(false); setEditingTask(null); }}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Task Management</h2>
        {user && role !== 'STUDENT' && (
          <Button onClick={() => setShowTaskModal(true)} className="inline-flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {role === 'STUDENT' ? (
            <>
              <button
                onClick={() => setActiveTab('available')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'available'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Available Tasks
              </button>
              {(() => {
                const seenMap = loadSeenMap();
                const updated = myApplications.filter(a => ['approved','rejected','completed'].includes((a.status || '').toLowerCase()));
                const unseenList = updated.filter(a => {
                  const key = String(a.id);
                  const seenVal = Number(seenMap[key] || 0);
                  const updatedAtMs = a.updated_at ? Date.parse(a.updated_at) : 0;
                  return seenVal !== updatedAtMs;
                });
                const unseenCount = unseenList.length;
                const titles = unseenList.slice(0,3).map(a => a.title).join(', ');
                const titleAttr = unseenCount > 0 ? `Updates: ${titles}` : undefined;
                return (
                  <button
                    key="applications-tab"
                    title={titleAttr}
                    onClick={() => setActiveTab('applications')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'applications'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      My Applications
                      {unseenCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                          {unseenCount}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })()}
              {(() => {
                const seenMap = loadSeenMap();
                const approved = myApplications.filter(a => (a.status || '').toLowerCase() === 'approved');
                const unseenApproved = approved.filter(a => {
                  const key = String(a.id);
                  const seenVal = Number(seenMap[key] || 0);
                  const updatedAtMs = a.updated_at ? Date.parse(a.updated_at) : 0;
                  return seenVal !== updatedAtMs;
                });
                const unseenCount = unseenApproved.length;
                const titles = unseenApproved.slice(0,3).map(a => a.title).join(', ');
                const titleAttr = unseenCount > 0 ? `Approved: ${titles}` : undefined;
                return (
                  <button
                    key="mytasks-tab"
                    title={titleAttr}
                    onClick={() => setActiveTab('mytasks')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'mytasks'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      My Tasks
                      {unseenCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                          {unseenCount}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })()}
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setActiveTab('available')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'available'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Available Tasks
              </button>
              {(() => {
                const pendingCount = adminApplications.filter(a => (a.status || '').toLowerCase() === 'pending').length;
                const titles = adminApplications.filter(a => (a.status || '').toLowerCase() === 'pending').slice(0,3).map(a => a.title).join(', ');
                const titleAttr = pendingCount > 0 ? `Pending: ${titles}` : undefined;
                return (
                  <button
                    key="applications-admin-tab"
                    title={titleAttr}
                    onClick={() => setActiveTab('applications')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'applications'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      Applications
                      {pendingCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                          {pendingCount}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })()}
            </>
          )}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'applications' && role === 'STUDENT' ? (
            <div className="col-span-full grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="min-w-0 flex flex-col">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Pending</h4>
                <div className="space-y-2">
                   {myApplications.filter(a => a.status === 'pending').length === 0 && (
                    <Card>
                      <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4 flex items-center justify-center text-sm text-muted-foreground h-auto sm:min-h-[110px]">
                        No pending applications
                      </CardContent>
                    </Card>
                  )}
                  {myApplications.filter(a => a.status === 'pending').map((application) => (
                    <Card key={application.id}>
                      <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4 flex flex-col gap-2 h-auto sm:min-h-[110px]">
                        <div className="flex justify-between items-start mb-1">
                          <div className="text-sm sm:text-base font-medium text-gray-900">{application.title}</div>
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                            <button onClick={(e) => { e.stopPropagation(); setApplicationToWithdraw(application); setShowWithdrawConfirm(true); }} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
                          </div>
                        </div>
                        {application.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{application.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span className="inline-flex items-center"><Clock className="w-3 h-3 mr-1" />{application.hours_offered}h</span>
                          {application.task_date && (<span className="inline-flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(application.task_date).toLocaleDateString()}</span>)}
                          {application.location && (<span className="inline-flex items-center"><MapPin className="w-3 h-3 mr-1" />{application.location}</span>)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="min-w-0 flex flex-col">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Rejected</h4>
                <div className="space-y-2">
                  {myApplications.filter(a => a.status === 'rejected').length === 0 && (
                    <Card>
                      <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4 flex items-center justify-center text-sm text-muted-foreground h-auto sm:min-h-[110px]">
                        No rejected applications
                      </CardContent>
                    </Card>
                  )}
                  {myApplications.filter(a => a.status === 'rejected').map((application) => (
                    <Card key={application.id}>
                      <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4 flex flex-col gap-2 h-auto sm:min-h-[110px]">
                        <div className="flex justify-between items-start mb-1">
                          <div className="text-sm sm:text-base font-medium text-gray-900">{application.title}</div>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">Rejected</span>
                        </div>
                        {application.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{application.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span className="inline-flex items-center"><Clock className="w-3 h-3 mr-1" />{application.hours_offered}h</span>
                          {application.task_date && (<span className="inline-flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(application.task_date).toLocaleDateString()}</span>)}
                          {application.location && (<span className="inline-flex items-center"><MapPin className="w-3 h-3 mr-1" />{application.location}</span>)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'mytasks' && role === 'STUDENT' ? (
            <div className="col-span-full grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="min-w-0 flex flex-col">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Approved</h4>
                <div className="space-y-2">
                  {myApplications.filter(a => a.status === 'approved').length === 0 && (
                    <Card>
                      <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4 flex items-center justify-center text-sm text-muted-foreground h-auto sm:min-h-[110px]">
                        No approved tasks
                      </CardContent>
                    </Card>
                  )}
                  {myApplications.filter(a => a.status === 'approved').map((application) => (
                    <Card key={application.id}>
                      <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4 flex flex-col space-y-2 h-auto sm:min-h-[110px]">
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-sm sm:text-base font-medium text-gray-900">{application.title}</div>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Approved</span>
                      </div>
                      {application.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{application.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="inline-flex items-center"><Clock className="w-3 h-3 mr-1" />{application.hours_offered}h</span>
                        {application.task_date && (<span className="inline-flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(application.task_date).toLocaleDateString()}</span>)}
                        {application.location && (<span className="inline-flex items-center"><MapPin className="w-3 h-3 mr-1" />{application.location}</span>)}
                      </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="min-w-0 flex flex-col">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Completed</h4>
                <div className="space-y-2">
                  {myApplications.filter(a => a.status === 'completed').length === 0 && (
                    <Card>
                      <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4 flex items-center justify-center text-sm text-muted-foreground h-auto sm:min-h-[110px]">
                        No completed tasks
                      </CardContent>
                    </Card>
                  )}
                  {myApplications.filter(a => a.status === 'completed').map((application) => (
                    <Card key={application.id}>
                      <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4 flex flex-col space-y-2 h-auto sm:min-h-[110px]">
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-sm sm:text-base font-medium text-gray-900">{application.title}</div>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Completed</span>
                      </div>
                      {application.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{application.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        {(() => { const hrs = getRenderedHours(application); return hrs !== null ? (
                          <span className="inline-flex items-center"><Clock className="w-3 h-3 mr-1" />{`${hrs}h`}</span>
                        ) : null; })()}
                        {application.task_date && (<span className="inline-flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(application.task_date).toLocaleDateString()}</span>)}
                        {application.location && (<span className="inline-flex items-center"><MapPin className="w-3 h-3 mr-1" />{application.location}</span>)}
                      </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'applications' && (role === 'ADMIN' || role === 'FACULTY') ? (
            <div className="col-span-full">
              {/* Mobile: single column stacked sections */}
              <div className="block sm:hidden space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Pending</h4>
                  <div className="space-y-1">
                    {adminApplications.filter(a => a.status === 'pending').length === 0 && (
                      <Card>
                        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex items-center justify-center text-sm text-muted-foreground sm:min-h-[180px]">No pending applications</CardContent>
                      </Card>
                    )}
                    {adminApplications.filter(a => a.status === 'pending').map((app) => (
                      <AdminApplicationCard key={app.id} app={app} onUpdate={updateApplicationStatus} />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Approved</h4>
                  <div className="space-y-1">
                    {adminApplications.filter(a => a.status === 'approved').length === 0 && (
                      <Card>
                        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex items-center justify-center text-sm text-muted-foreground sm:min-h-[180px]">No approved applications</CardContent>
                      </Card>
                    )}
                    {adminApplications.filter(a => a.status === 'approved').map((app) => (
                      <AdminApplicationCard key={app.id} app={app} onUpdate={updateApplicationStatus} />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Completed</h4>
                  <div className="space-y-1">
                    {adminApplications.filter(a => a.status === 'completed').length === 0 && (
                      <Card>
                        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex items-center justify-center text-sm text-muted-foreground sm:min-h-[180px]">No completed applications</CardContent>
                      </Card>
                    )}
                    {adminApplications.filter(a => a.status === 'completed').map((app) => (
                      <AdminApplicationCard key={app.id} app={app} onUpdate={updateApplicationStatus} />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Rejected</h4>
                  <div className="space-y-1">
                    {adminApplications.filter(a => a.status === 'rejected').length === 0 && (
                      <Card>
                        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex items-center justify-center text-sm text-muted-foreground sm:min-h-[180px]">No rejected applications</CardContent>
                      </Card>
                    )}
                    {adminApplications.filter(a => a.status === 'rejected').map((app) => (
                      <AdminApplicationCard key={app.id} app={app} onUpdate={updateApplicationStatus} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Desktop/tablet: multi-column grid */}
              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2 lg:gap-4 mt-2">
                <div className="min-w-0 flex flex-col h-auto lg:h-[520px]">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Pending</h4>
                  <div className="space-y-1 sm:space-y-2 lg:flex-1 lg:overflow-y-auto">
                    {adminApplications.filter(a => a.status === 'pending').length === 0 && (
                      <Card>
                        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex items-center justify-center text-sm text-muted-foreground h-auto sm:min-h-[180px]">No pending applications</CardContent>
                      </Card>
                    )}
                    {adminApplications.filter(a => a.status === 'pending').map((app) => (
                      <AdminApplicationCard key={app.id} app={app} onUpdate={updateApplicationStatus} />
                    ))}
                  </div>
                </div>
                <div className="min-w-0 flex flex-col h-auto lg:h-[520px]">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Approved</h4>
                  <div className="space-y-1 sm:space-y-2 lg:flex-1 lg:overflow-y-auto">
                    {adminApplications.filter(a => a.status === 'approved').length === 0 && (
                      <Card>
                        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex items-center justify-center text-sm text-muted-foreground h-auto sm:min-h-[180px]">No approved applications</CardContent>
                      </Card>
                    )}
                    {adminApplications.filter(a => a.status === 'approved').map((app) => (
                      <AdminApplicationCard key={app.id} app={app} onUpdate={updateApplicationStatus} />
                    ))}
                  </div>
                </div>
                <div className="min-w-0 flex flex-col h-auto lg:h-[520px]">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Completed</h4>
                  <div className="space-y-1 sm:space-y-2 lg:flex-1 lg:overflow-y-auto">
                    {adminApplications.filter(a => a.status === 'completed').length === 0 && (
                      <Card>
                        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex items-center justify-center text-sm text-muted-foreground h-auto sm:min-h-[180px]">No completed applications</CardContent>
                      </Card>
                    )}
                    {adminApplications.filter(a => a.status === 'completed').map((app) => (
                      <AdminApplicationCard key={app.id} app={app} onUpdate={updateApplicationStatus} />
                    ))}
                  </div>
                </div>
                <div className="min-w-0 flex flex-col h-auto lg:h-[520px]">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Rejected</h4>
                  <div className="space-y-1 sm:space-y-2 lg:flex-1 lg:overflow-y-auto">
                    {adminApplications.filter(a => a.status === 'rejected').length === 0 && (
                      <Card>
                        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex items-center justify-center text-sm text-muted-foreground h-auto sm:min-h-[180px]">No rejected applications</CardContent>
                      </Card>
                    )}
                    {adminApplications.filter(a => a.status === 'rejected').map((app) => (
                      <AdminApplicationCard key={app.id} app={app} onUpdate={updateApplicationStatus} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">{task.title}</h3>
                  <div className="flex items-center gap-2">
                    {(role === 'ADMIN' || role === 'FACULTY') && (
                      <div className="flex items-center gap-1">
                        <button
                          title="Edit task"
                          onClick={() => { setEditingTask(task); setShowEditModal(true); }}
                          className="p-1 text-muted-foreground hover:text-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          title="Delete task"
                          onClick={() => { setTaskToDelete(task); setShowDeleteTask(true); }}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {(() => {
                      const isClosedByApproval = (task.max_participants != null) && (Number(task.approved_count) >= Number(task.max_participants));
                      const displayStatus = isClosedByApproval ? 'closed' : task.status;
                      const badgeClass = displayStatus === 'open'
                        ? 'bg-green-100 text-green-800'
                        : displayStatus === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : displayStatus === 'closed'
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-gray-100 text-gray-800';
                      return (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeClass}`}>
                          {displayStatus}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                
                <div className="space-y-2 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {task.hours_offered} hours
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    {task.max_participants == null
                      ? `${Number(task.approved_count || 0)} participants (no limit)`
                      : `${Number(task.approved_count || 0)}/${task.max_participants} participants`}
                  </div>
                  {task.task_date && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(task.task_date).toLocaleDateString()}
                    </div>
                  )}
                  {task.location && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {task.location}
                    </div>
                  )}
                </div>

                {(() => {
                  const isClosedByApproval = (task.max_participants != null) && (Number(task.approved_count) >= Number(task.max_participants));
                  return role === 'STUDENT' && task.status === 'open' && !isClosedByApproval && (task.max_participants == null || task.current_participants < task.max_participants) && (
                  <Button className="w-full" onClick={() => applyForTask(task.id)} disabled={!!applyingIds[task.id]}>
                    {applyingIds[task.id] ? 'Applying...' : 'Apply for Task'}
                  </Button>
                  );
                })()}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {showTaskModal && <TaskModal />}
      {showEditModal && editingTask && <EditTaskModal task={editingTask} />}

      {/* Delete Task Confirmation */}
      <AlertDialog open={showDeleteTask} onOpenChange={(o) => { setShowDeleteTask(o); if (!o) setTaskToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task "{taskToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => taskToDelete && deleteTask(taskToDelete.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw Application Confirmation */}
      <AlertDialog open={showWithdrawConfirm} onOpenChange={(o) => { setShowWithdrawConfirm(o); if (!o) setApplicationToWithdraw(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw your application{applicationToWithdraw?.title ? ` for "${applicationToWithdraw.title}"` : ''}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => applicationToWithdraw && withdrawApplication(applicationToWithdraw.id)}>Withdraw</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Admin/Faculty application management card
const AdminApplicationCard = ({ app, onUpdate }) => {
  const status = app.status;
  const offered = app.hours_offered || 0;

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex flex-col gap-3 h-auto sm:min-h-[180px]">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2">{app.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-1">{app.first_name} {app.last_name} ({app.student_id || 'N/A'})</p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            status === 'approved' ? 'bg-green-100 text-green-800' :
            status === 'completed' ? 'bg-blue-100 text-blue-800' :
            status === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {status}
          </span>
        </div>

        <div className="text-sm text-gray-600">
          <div>Hours Offered: <span className="font-medium text-gray-800">{offered}</span></div>
        </div>

        <div className="flex justify-end gap-2 mt-auto">
          {status === 'pending' && (
            <>
              <Button variant="ghost" onClick={() => onUpdate(app.id, 'rejected')}>Reject</Button>
              <Button onClick={() => onUpdate(app.id, 'approved')}>Approve</Button>
            </>
          )}
          {status === 'approved' && (
            <Button onClick={() => onUpdate(app.id, 'completed', offered, 'Completed (auto-deduct hours_offered)')}>
              Complete
            </Button>
          )}
          {status === 'completed' && (
            <div className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 inline-flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" /> Completed ({offered} hours)
            </div>
          )}
          {status === 'rejected' && (
            <div className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 inline-flex items-center">
              Rejected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskManagement;
