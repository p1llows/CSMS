import axios from 'axios';
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, subMonths, addMonths } from 'date-fns';
import { Plus, Edit, Trash2, MapPin, Clock, Calendar } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

import { useAuth } from '../../context/AuthContext.jsx';

const parseLocalDate = (val) => {
  if (!val) return new Date(NaN);
  if (val instanceof Date) return val;
  const match = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(val);
};

const EventCalendar = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [allEventsStatus, setAllEventsStatus] = useState('all');
  const [allEventsType, setAllEventsType] = useState('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const dayEvents = events.filter(event => 
      isSameDay(parseLocalDate(event.event_date), date)
    );
    setSelectedDateEvents(dayEvents);
  }, [date, events]);

  const fetchEvents = async () => {
    try {
      // Load all events (no date filter) so we can list all and populate the calendar
      const params = {
        page: 1,
        limit: 1000
      };
      const response = await axios.get('/api/events', { params });
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const EventModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      type: 'Events',
      eventDate: format(date, 'yyyy-MM-dd'),
      startTime: '',
      endTime: '',
      location: '',
      description: '',
      penaltyHours: 10,
      isMandatory: true
    });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
      if (editingEvent) {
        const eventDateStr = format(parseLocalDate(editingEvent.event_date), 'yyyy-MM-dd');
        const displayType = editingEvent.type === 'FRC' ? 'FRC' : 'Events';
        const base = {
          name: editingEvent.name,
          type: displayType,
          eventDate: eventDateStr,
          startTime: editingEvent.start_time || '',
          endTime: editingEvent.end_time || '',
          location: editingEvent.location || '',
          description: editingEvent.description || '',
          penaltyHours: editingEvent.penalty_hours || 0,
          isMandatory: editingEvent.is_mandatory
        };
        setFormData(displayType === 'FRC' ? { ...base, name: eventDateStr } : base);
      }
    }, [editingEvent]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitError('');
      setSubmitLoading(true);
      try {
        const backendType = formData.type;
        const ensuredDate = formData.eventDate && formData.eventDate.trim() !== ''
          ? formData.eventDate
          : format(new Date(), 'yyyy-MM-dd');
        const payload = { ...formData, type: backendType, eventDate: ensuredDate };
        
        if (!payload.startTime) delete payload.startTime;
        if (!payload.endTime) delete payload.endTime;
        if (!payload.location) delete payload.location;
        if (!payload.description) delete payload.description;

        if (editingEvent) {
          await axios.put(`/api/events/${editingEvent.id}`, payload);
        } else {
          await axios.post('/api/events', payload);
        }
        await fetchEvents();
        setShowEventModal(false);
        setEditingEvent(null);
      } catch (error) {
        console.error('Failed to save event:', error);
        const msg = error?.response?.data?.error
          || (Array.isArray(error?.response?.data?.errors) ? error.response.data.errors.map(e => e.msg).join(', ') : '')
          || error.message
          || 'Failed to save event';
        setSubmitError(msg);
      } finally {
        setSubmitLoading(false);
      }
    };

    return (
      <Dialog open={showEventModal} onOpenChange={(open) => { setShowEventModal(open); if (!open) setEditingEvent(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
            <DialogDescription>Fill out the details below and save to {editingEvent ? 'update' : 'create'} the event.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-1 inline-block">Event Name</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div>
              <Label className="mb-1 inline-block">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(nextType) => {
                  const defaultPenalty = nextType === 'FRC' ? 3 : 10;
                  const nextName = nextType === 'FRC' ? formData.eventDate : formData.name;
                  setFormData({ ...formData, type: nextType, penaltyHours: defaultPenalty, name: nextName });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Events">Events</SelectItem>
                  <SelectItem value="FRC">FRC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 inline-block">Date</Label>
              <Input
                type="date"
                value={formData.eventDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  if (formData.type === 'FRC') {
                    setFormData({ ...formData, eventDate: newDate, name: newDate });
                  } else {
                    setFormData({ ...formData, eventDate: newDate });
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 inline-block">Start Time (optional)</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                />
              </div>
              <div>
                <Label className="mb-1 inline-block">End Time (optional)</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
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
              <Label className="mb-1 inline-block">Description</Label>
              <textarea
                className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div>
              <Label className="mb-1 inline-block">Penalty Hours (for absence)</Label>
              <Input
                type="number"
                min="0"
                value={formData.penaltyHours}
                onChange={(e) => setFormData({...formData, penaltyHours: parseInt(e.target.value)})}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mandatory"
                checked={formData.isMandatory}
                onChange={(e) => setFormData({...formData, isMandatory: e.target.checked})}
                className="h-4 w-4"
              />
              <Label htmlFor="mandatory">Mandatory Event</Label>
            </div>

            {submitError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {submitError}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setShowEventModal(false); setEditingEvent(null); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading ? 'Saving...' : (editingEvent ? 'Update' : 'Create')} Event
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  const deleteEvent = async (eventId) => {
    try {
      await axios.delete(`/api/events/${eventId}`);
      await fetchEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
    } finally {
      setShowDelete(false);
      setEventToDelete(null);
    }
  };

  const frcEventsSorted = useMemo(() => (
    events
      .filter(e => (e.type || '').toUpperCase() === 'FRC')
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  ), [events]);

  const otherEventsSorted = useMemo(() => (
    events
      .filter(e => (e.type || '').toUpperCase() !== 'FRC')
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  ), [events]);

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const toDate = (d) => parseLocalDate(d);

    const upcoming = events
      .filter(e => toDate(e.event_date) >= todayStart)
      .sort((a, b) => toDate(b.event_date) - toDate(a.event_date));

    const past = events
      .filter(e => toDate(e.event_date) < todayStart)
      .sort((a, b) => toDate(b.event_date) - toDate(a.event_date));

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  const eventTypes = useMemo(() => {
    // Normalize to two buckets: 'FRC' and 'Events' (everything else)
    const hasFrc = events.some(e => (e.type || '').toUpperCase() === 'FRC');
    const hasNonFrc = events.some(e => (e.type || '').toUpperCase() !== 'FRC');
    const types = [];
    if (hasFrc) types.push({ key: 'FRC', label: 'FRC' });
    if (hasNonFrc) types.push({ key: 'EVENTS', label: 'Events' });
    return types;
  }, [events]);

  const gridColsClass = useMemo(() => {
    const n = eventTypes.length;
    if (n >= 3) return 'md:grid-cols-3';
    if (n === 2) return 'md:grid-cols-2';
    return 'md:grid-cols-1';
  }, [eventTypes]);

  const cardClass =
    'rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.03)] dark:shadow-none';
  const isAdmin = (user?.role || '').toString().toUpperCase() === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground mb-1">
            Schedule &amp; Events
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Event Calendar
          </h2>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingEvent(null); setShowEventModal(true); }} size="sm" className="rounded-full px-4 gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className={`${cardClass} overflow-hidden`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-2 px-5 sm:px-6 py-4 border-b border-border/60">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {format(date, 'MMMM yyyy')}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full px-3 h-8 text-xs"
                      onClick={() => setDate(new Date())}
                    >
                      Today
                    </Button>
                    <div className="inline-flex items-center rounded-full bg-muted p-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full h-7 px-2.5 text-xs"
                        onClick={() => setDate(prev => subMonths(prev, 1))}
                      >
                        ‹ Prev
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full h-7 px-2.5 text-xs"
                        onClick={() => setDate(prev => addMonths(prev, 1))}
                      >
                        Next ›
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="grid grid-cols-7 bg-muted/40 border-b border-border/60 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-center py-2.5">{d}</div>
                    ))}
                  </div>

                  {(() => {
                    const monthStart = startOfMonth(date);
                    const monthEnd = endOfMonth(date);
                    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
                    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

                    const rows = [];
                    let day = startDate;
                    while (day <= endDate) {
                      const days = [];
                      for (let i = 0; i < 7; i++) {
                        const dayDate = day;
                        const inMonth = isSameMonth(dayDate, monthStart);
                        const isToday = isSameDay(dayDate, new Date());
                        const isSelected = isSameDay(dayDate, date);
                        const dayEvents = events.filter(ev => isSameDay(parseLocalDate(ev.event_date), dayDate));
                        days.push(
                          <div
                            key={dayDate.toISOString()}
                            onClick={() => setDate(dayDate)}
                            onDoubleClick={() => {
                              setDate(dayDate);
                              if (isAdmin) {
                                setEditingEvent(null);
                                setShowEventModal(true);
                              }
                            }}
                            className={`relative p-2.5 min-h-[96px] cursor-pointer transition-colors ${
                              inMonth ? 'bg-card' : 'bg-muted/25'
                            } ${
                              isSelected ? 'bg-primary/[0.04]' : 'hover:bg-muted/40'
                            }`}
                          >
                            {isSelected && (
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-1 rounded-xl ring-1 ring-primary/60"
                              />
                            )}
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full tabular-nums text-xs ${
                                  isToday
                                    ? 'bg-primary text-primary-foreground font-semibold'
                                    : inMonth
                                    ? 'text-foreground font-medium'
                                    : 'text-muted-foreground/60'
                                }`}
                              >
                                {format(dayDate, 'd')}
                              </span>
                              {dayEvents.length > 0 && (
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              )}
                            </div>
                            <div className="space-y-1">
                              {dayEvents.slice(0, 3).map(ev => (
                                <button
                                  key={ev.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (user?.role !== 'STUDENT') {
                                      setEditingEvent(ev);
                                      setShowEventModal(true);
                                    } else {
                                      setDate(dayDate);
                                    }
                                  }}
                                  className="w-full text-left text-[11px] font-medium truncate px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                  title={ev.name}
                                >
                                  {ev.name}
                                </button>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                              )}
                            </div>
                          </div>
                        );
                        day = addDays(day, 1);
                      }
                      rows.push(
                        <div key={day.toISOString()} className="grid grid-cols-7 divide-x divide-border/50">
                          {days}
                        </div>
                      );
                    }
                    return <div className="divide-y divide-border/50">{rows}</div>;
                  })()}
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card className={cardClass}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">
                Events on {format(date, 'MMM dd, yyyy')}
              </h3>
              {selectedDateEvents.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {selectedDateEvents.length}
                </span>
              )}
            </div>
            {selectedDateEvents.length > 0 ? (
              <div className="divide-y divide-border/70">
                {selectedDateEvents.map((event) => (
                  <div key={event.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground truncate">{event.name}</h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                            {event.type}
                          </span>
                        </div>
                        <div className="mt-1.5 space-y-1">
                          {event.start_time && (
                            <div className="flex items-center text-xs text-muted-foreground tabular-nums">
                              <Clock className="w-3 h-3 mr-1.5" />
                              {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1.5" />
                              {event.location}
                            </div>
                          )}
                          {Number(event.penalty_hours || 0) > 0 && (
                            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium tabular-nums">
                              Penalty: {event.penalty_hours}h
                            </div>
                          )}
                        </div>
                      </div>
                      {user?.role !== 'STUDENT' && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingEvent(event);
                              setShowEventModal(true);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                            aria-label="Edit event"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEventToDelete(event); setShowDelete(true); }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label="Delete event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">No events scheduled</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select another date or schedule a new event.
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-4"
                    onClick={() => { setEditingEvent(null); setShowEventModal(true); }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Event
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cardClass}>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">All Events</h3>
              {events?.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">({events.length})</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-full bg-muted p-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'past', label: 'Past' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAllEventsStatus(tab.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      allEventsStatus === tab.id
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="inline-flex items-center rounded-full bg-muted p-1">
                {[
                  { id: 'all', label: 'All Types' },
                  { id: 'FRC', label: 'FRC' },
                  { id: 'EVENTS', label: 'Events' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAllEventsType(tab.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      allEventsType === tab.id
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (() => {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const filteredAllEvents = (events || [])
              .filter((e) => {
                const evDate = parseLocalDate(e.event_date);
                if (allEventsStatus === 'upcoming' && evDate < todayStart) return false;
                if (allEventsStatus === 'past' && evDate >= todayStart) return false;
                const isFrc = (e.type || '').toUpperCase() === 'FRC';
                if (allEventsType === 'FRC' && !isFrc) return false;
                if (allEventsType === 'EVENTS' && isFrc) return false;
                return true;
              })
              .sort((a, b) => parseLocalDate(b.event_date) - parseLocalDate(a.event_date));

            if (filteredAllEvents.length === 0) {
              return (
                <div className="py-10 text-center space-y-2">
                  <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-medium text-foreground">No matching events</p>
                  <p className="text-xs text-muted-foreground">
                    Try switching filters or schedule a new event.
                  </p>
                </div>
              );
            }

            return (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/70">
                  <thead>
                    <tr>
                      <th className="py-2.5 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Event
                      </th>
                      <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Date &amp; Time
                      </th>
                      <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Location
                      </th>
                      <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Status
                      </th>
                      {user?.role !== 'STUDENT' && (
                        <th className="py-2.5 pl-4 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredAllEvents.map((e) => {
                      const evDate = parseLocalDate(e.event_date);
                      const isUpcoming = evDate >= todayStart;
                      return (
                        <tr
                          key={e.id}
                          onClick={() => setDate(evDate)}
                          className="hover:bg-muted/35 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{e.name}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                                {e.type}
                              </span>
                              {Number(e.penalty_hours || 0) > 0 && (
                                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium tabular-nums">
                                  {e.penalty_hours}h
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                            <div className="text-foreground">{format(evDate, 'MMM dd, yyyy')}</div>
                            {e.start_time && (
                              <div className="text-xs text-muted-foreground">
                                {e.start_time}{e.end_time ? ` – ${e.end_time}` : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-sm text-muted-foreground">
                            {e.location || '—'}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                                isUpcoming
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {isUpcoming ? 'Upcoming' : 'Past'}
                            </span>
                          </td>
                          {user?.role !== 'STUDENT' && (
                            <td
                              className="py-3.5 pl-4 whitespace-nowrap text-right"
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEvent(e);
                                    setShowEventModal(true);
                                  }}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                                  aria-label="Edit event"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEventToDelete(e); setShowDelete(true); }}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  aria-label="Delete event"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {showEventModal && <EventModal />}

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={(o) => { setShowDelete(o); if (!o) setEventToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event "{eventToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => eventToDelete && deleteEvent(eventToDelete.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventCalendar;
