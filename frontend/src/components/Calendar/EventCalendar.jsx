import axios from 'axios';
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, subMonths, addMonths } from 'date-fns';
import { Plus, Edit, Trash2, MapPin, Clock } from 'lucide-react';
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

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const dayEvents = events.filter(event => 
      isSameDay(new Date(event.event_date), date)
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
        const eventDateStr = format(new Date(editingEvent.event_date), 'yyyy-MM-dd');
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

    const toDate = (d) => new Date(d);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Event Calendar</h2>
        {((user?.role || '').toString().toUpperCase() === 'ADMIN') && (
          <Button onClick={() => setShowEventModal(true)} className="inline-flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={() => setDate(prev => subMonths(prev, 1))}
                    >
                      ‹ Prev
                    </Button>
                    <h3 className="text-lg font-semibold text-gray-900">{format(date, 'MMMM yyyy')}</h3>
                    <Button
                      variant="ghost"
                      onClick={() => setDate(prev => addMonths(prev, 1))}
                    >
                      Next ›
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-500">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                      <div key={d} className="text-center">{d}</div>
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
                        const dayEvents = events.filter(ev => isSameDay(new Date(ev.event_date), dayDate));
                        days.push(
                          <div
                            key={dayDate.toISOString()}
                            onClick={() => setDate(dayDate)}
                            onDoubleClick={() => {
                              setDate(dayDate);
                              if (((user?.role || '').toString().toUpperCase()) === 'ADMIN') {
                                setEditingEvent(null);
                                setShowEventModal(true);
                              }
                            }}
                            className={`border rounded-lg p-2 min-h-[100px] cursor-pointer transition-all duration-150 ${inMonth ? 'bg-white' : 'bg-gray-50'} ${isSelected ? 'ring-2 ring-primary-500' : ''} hover:shadow-md hover:bg-accent/40 hover:border-primary/40`}
                          >
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-primary-600 text-white' : 'text-gray-700'}`}>{format(dayDate, 'd')}</span>
                              {dayEvents.length > 0 && (
                                <span className="text-[10px] text-primary-700 font-semibold">{dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}</span>
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
                                  className="w-full text-left text-[11px] truncate px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                  title={ev.name}
                                >
                                  {ev.name}
                                </button>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="text-[11px] text-gray-500">+{dayEvents.length - 3} more</div>
                              )}
                            </div>
                          </div>
                        );
                        day = addDays(day, 1);
                      }
                      rows.push(
                        <div key={day.toISOString()} className="grid grid-cols-7 gap-2">
                          {days}
                        </div>
                      );
                    }
                    return <div className="space-y-2">{rows}</div>;
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Events on {format(date, 'MMM dd, yyyy')}
          </h3>
          <div className="space-y-3">
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event) => (
                <div key={event.id} className="p-3 bg-accent rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{event.name}</h4>
                      <p className="text-sm text-muted-foreground">{event.type}</p>
                      {event.start_time && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {event.start_time} - {event.end_time}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    {user?.role !== 'STUDENT' && (
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={() => {
                            setEditingEvent(event);
                            setShowEventModal(true);
                          }}
                          className="p-1 text-muted-foreground hover:text-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEventToDelete(event); setShowDelete(true); }}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No events scheduled</p>
            )}
          </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">All Events</h3>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          events && events.length > 0 ? (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Upcoming</h4>
                <div className={`grid grid-cols-1 gap-4 ${gridColsClass}`}>
                  {eventTypes.map((t) => {
                    const list = upcomingEvents.filter(e => {
                      const key = (e.type || '').toUpperCase();
                      return t.key === 'FRC' ? key === 'FRC' : key !== 'FRC';
                    });
                    return (
                      <div key={`upcoming-${t.key}`} className="space-y-3">
                        <div className="text-xs font-semibold text-muted-foreground">{t.label}</div>
                        {list.length > 0 ? list.map((e) => (
                          <div key={e.id} className="p-3 bg-card border border-border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="text-sm text-muted-foreground">{format(new Date(e.event_date), 'MMM dd, yyyy')}</div>
                                <h4 className="font-medium text-foreground">{e.name}</h4>
                                <p className="text-sm text-muted-foreground">{e.type}</p>
                                {e.start_time && (
                                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {e.start_time} {e.end_time ? `- ${e.end_time}` : ''}
                                  </div>
                                )}
                                {e.location && (
                                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {e.location}
                                  </div>
                                )}
                              </div>
                              {user?.role !== 'STUDENT' && (
                                <div className="flex space-x-1 ml-2">
                                  <button
                                    onClick={() => {
                                      setEditingEvent(e);
                                      setShowEventModal(true);
                                    }}
                                    className="p-1 text-muted-foreground hover:text-primary"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => { setEventToDelete(e); setShowDelete(true); }}
                                    className="p-1 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <p className="text-muted-foreground text-sm">No upcoming {t.label.toLowerCase()} events</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Past</h4>
                <div className={`grid grid-cols-1 gap-4 ${gridColsClass}`}>
                  {eventTypes.map((t) => {
                    const list = pastEvents.filter(e => {
                      const key = (e.type || '').toUpperCase();
                      return t.key === 'FRC' ? key === 'FRC' : key !== 'FRC';
                    });
                    return (
                      <div key={`past-${t.key}`} className="space-y-3">
                        <div className="text-xs font-semibold text-muted-foreground">{t.label}</div>
                        {list.length > 0 ? list.map((e) => (
                          <div key={e.id} className="p-3 bg-card border border-border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="text-sm text-muted-foreground">{format(new Date(e.event_date), 'MMM dd, yyyy')}</div>
                                <h4 className="font-medium text-foreground">{e.name}</h4>
                                <p className="text-sm text-muted-foreground">{e.type}</p>
                                {e.start_time && (
                                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {e.start_time} {e.end_time ? `- ${e.end_time}` : ''}
                                  </div>
                                )}
                                {e.location && (
                                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {e.location}
                                  </div>
                                )}
                              </div>
                              {user?.role !== 'STUDENT' && (
                                <div className="flex space-x-1 ml-2">
                                  <button
                                    onClick={() => {
                                      setEditingEvent(e);
                                      setShowEventModal(true);
                                    }}
                                    className="p-1 text-muted-foreground hover:text-primary"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => { setEventToDelete(e); setShowDelete(true); }}
                                    className="p-1 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <p className="text-muted-foreground text-sm">No past {t.label.toLowerCase()} events</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No events found</p>
          )
        )}
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
