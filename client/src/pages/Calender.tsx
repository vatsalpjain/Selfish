import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { addEvent, updateEvent, deleteEvent as deleteEventAPI } from '../services/api';

interface CalendarEvent {
    id: string;
    summary: string;
    start: {
        dateTime?: string;
        date?: string;
    };
    end?: {
        dateTime?: string;
        date?: string;
    };
    colorId?: string;
}

export default function CalenderPage() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Event Modal State
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Form State
    const [eventTitle, setEventTitle] = useState('');
    const [eventStart, setEventStart] = useState('');
    const [eventEnd, setEventEnd] = useState('');
    const [saveMessage, setSaveMessage] = useState('');

    // Feature 4: Search/Filter State
    // searchQuery: Stores the user's search input
    // filteredEvents: Computed array of events that match the search query
    const [searchQuery, setSearchQuery] = useState('');

    // Sync banner state
    const [showSyncBanner, setShowSyncBanner] = useState(false);

    // Filter events based on search query (case-insensitive)
    // If search is empty, show all events. Otherwise, filter by title.
    const filteredEvents = searchQuery.trim() === ''
        ? events
        : events.filter(event =>
            event.summary.toLowerCase().includes(searchQuery.toLowerCase())
        );

    useEffect(() => {
        checkConnectionStatus();
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('calendar') === 'connected') {
            window.history.replaceState({}, '', '/calendar');
            setTimeout(() => {
                checkConnectionStatus();
            }, 500);
        }
    }, []);

    const checkConnectionStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/calendar/status', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsConnected(res.data.connected);

            if (res.data.connected) {
                fetchEvents();
                // Show sync banner on first visit when connected
                const hasSeenBanner = localStorage.getItem('calendarSyncBannerSeen');
                if (!hasSeenBanner) {
                    setShowSyncBanner(true);
                    // Auto-dismiss after 5 seconds
                    setTimeout(() => {
                        setShowSyncBanner(false);
                        localStorage.setItem('calendarSyncBannerSeen', 'true');
                    }, 5000);
                }            }
        } catch (error) {
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEvents = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/calendar/events', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.connected) {
                setEvents(res.data.events || []);
                setIsConnected(true);
            }
        } catch (error: any) {
            // Feature 5: Handle token refresh failure
            // If backend returns needsReconnect, token refresh failed
            // User needs to manually reconnect their calendar
            if (error.response?.data?.needsReconnect) {
                setIsConnected(false);
                setEvents([]);
                alert('Your calendar connection has expired. Please reconnect your Google Calendar.');
            } else {
                setIsConnected(false);
            }
        }
    };

    const connectCalendar = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/calendar/auth/google', {
                headers: { Authorization: `Bearer ${token}` }
            });

            window.location.href = res.data.url;
        } catch (error) {
            alert('Failed to connect Google Calendar');
        }
    };

    const disconnectCalendar = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete('http://localhost:5000/api/calendar/disconnect', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsConnected(false);
            setEvents([]);
            alert('Calendar disconnected successfully');
        } catch (error) {
            // Silent fail
        }
    };

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const getEventsForDate = (day: number) => {
        // Feature 4: Use filteredEvents instead of all events
        // This ensures the calendar only shows events matching the search query
        return filteredEvents.filter(event => {
            const eventDate = new Date(event.start.dateTime || event.start.date || '');
            return eventDate.getDate() === day &&
                eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear();
        });
    };

    // Event Modal Handlers
    const openCreateModal = (date?: Date) => {
        setModalMode('create');
        setSelectedEvent(null);
        setEventTitle('');

        // Pre-fill date if provided (clicked on calendar day)
        if (date) {
            const dateStr = date.toISOString().slice(0, 16);
            setEventStart(dateStr);
            // Default to 1-hour duration
            const endDate = new Date(date.getTime() + 60 * 60 * 1000);
            setEventEnd(endDate.toISOString().slice(0, 16));
            setSelectedDate(date);
        } else {
            const now = new Date();
            setEventStart(now.toISOString().slice(0, 16));
            const later = new Date(now.getTime() + 60 * 60 * 1000);
            setEventEnd(later.toISOString().slice(0, 16));
            setSelectedDate(null);
        }

        setIsEventModalOpen(true);
    };

    const openEditModal = (event: CalendarEvent) => {
        setModalMode('edit');
        setSelectedEvent(event);
        setEventTitle(event.summary);
        setEventStart(event.start.dateTime?.slice(0, 16) || '');
        setEventEnd(event.end?.dateTime?.slice(0, 16) || '');
        setIsEventModalOpen(true);
    };

    const closeModal = () => {
        setIsEventModalOpen(false);
        setEventTitle('');
        setEventStart('');
        setEventEnd('');
        setSelectedEvent(null);
        setSelectedDate(null);
        setSaveMessage('');
    };

    const handleCreateEvent = async () => {
        if (!eventTitle || !eventStart || !eventEnd) {
            alert('Please fill in all fields');
            return;
        }

        try {
            await addEvent(eventTitle, eventStart, eventEnd);
            setSaveMessage('Event created successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
            closeModal();
            fetchEvents(); // Refresh events
        } catch (error) {
            console.error('Failed to create event:', error);
            alert('Failed to create event. Please try again.');
        }
    };

    const handleUpdateEvent = async () => {
        if (!selectedEvent || !eventTitle || !eventStart || !eventEnd) {
            alert('Please fill in all fields');
            return;
        }

        try {
            await updateEvent(selectedEvent.id, eventTitle, eventStart, eventEnd);
            setSaveMessage('Event updated successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
            closeModal();
            fetchEvents(); // Refresh events
        } catch (error) {
            console.error('Failed to update event:', error);
            alert('Failed to update event. Please try again.');
        }
    };

    const handleDeleteEvent = async (event: CalendarEvent, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation(); // Prevent event click from triggering
        }

        if (!confirm(`Delete event "${event.summary}"?`)) {
            return;
        }

        try {
            await deleteEventAPI(event.id);
            setSaveMessage('Event deleted successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
            closeModal();
            fetchEvents(); // Refresh events
        } catch (error) {
            console.error('Failed to delete event:', error);
            alert('Failed to delete event. Please try again.');
        }
    };

    const renderCalendar = () => {

        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const today = new Date();
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="p-1"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayEvents = getEventsForDate(day);
            const isToday = day === today.getDate() &&
                currentDate.getMonth() === today.getMonth() &&
                currentDate.getFullYear() === today.getFullYear();

            const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0);

            days.push(
                <div
                    key={day}
                    onClick={() => openCreateModal(clickedDate)}
                    className={`p-1.5 min-h-[50px] border border-white/5 rounded-lg ${isToday ? 'bg-blue-500/20 border-blue-500' : 'bg-white/5'
                        } hover:bg-white/10 transition-colors cursor-pointer`}
                >
                    <div className={`text-xs font-semibold mb-0.5 ${isToday ? 'text-blue-400' : 'text-white'
                        }`}>
                        {day}
                    </div>
                    <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map(event => (
                            <div
                                key={event.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(event);
                                }}
                                className="text-[10px] px-1 py-0.5 bg-orange-500/30 text-orange-200 rounded truncate hover:bg-orange-500/50 transition-colors cursor-pointer group relative flex items-center gap-1"
                                title={event.summary}
                            >
                                {/* Todo Link Indicator */}
                                <span className="text-blue-400" title="Synced with Todo">✓</span>
                                <span className="flex-1 truncate">{event.summary}</span>
                                <button
                                    onClick={(e) => handleDeleteEvent(event, e)}
                                    className="opacity-0 group-hover:opacity-100 bg-red-500 text-white px-1 rounded text-[8px] flex-shrink-0"
                                    title="Delete (will also delete linked todo)"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        {dayEvents.length > 2 && (
                            <div className="text-[10px] text-gray-400">+{dayEvents.length - 2}</div>
                        )}
                    </div>
                </div>
            );
        }

        return days;
    };

    const changeMonth = (delta: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    };

    if (isLoading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center bg-gray-900"
                style={{
                    backgroundImage: "url(/background.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundAttachment: "fixed",
                }}
            >
                <div className="text-gray-300 text-lg">Loading calendar...</div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-gray-900"
            style={{
                backgroundImage: "url(/background.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
            }}
        >
            {/* Floating Navbar */}
            <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-extralight tracking-wider bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Calendar</h1>
                        <div className="flex items-center gap-4">
                            <Link
                                to="/dashboard"
                                className="px-5 py-2.5 text-gray-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-lg hover:scale-105"
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/todos"
                                className="px-5 py-2.5 text-gray-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-lg hover:scale-105"
                            >
                                Todos
                            </Link>
                            <Link
                                to="/ai-chat"
                                className="px-5 py-2.5 text-gray-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-lg hover:scale-105"
                            >
                                AI Chat
                            </Link>
                            <div className="h-8 w-px bg-white/20"></div>
                            <button
                                onClick={() => { logout(); navigate('/login'); }}
                                className="px-5 py-2.5 text-gray-300 hover:text-white bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-lg"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-24 px-6 pb-4">
                <div className="max-w-6xl mx-auto">
                    {/* Sync Info Banner - Only show when connected, auto-dismisses after 5s */}
                    {isConnected && showSyncBanner && (
                        <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-4 mb-4 animate-fade-in">
                            <div className="flex items-start gap-3">
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                                    />
                                </svg>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-blue-300 mb-1">✓ Todo Sync Active</h3>
                                    <p className="text-xs text-blue-200/80">
                                        Calendar events automatically create todos. 
                                        Updates sync both ways. 
                                        Deleting an event also removes the linked todo.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowSyncBanner(false);
                                        localStorage.setItem('calendarSyncBannerSeen', 'true');
                                    }}
                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                    title="Dismiss"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-4 shadow-2xl">

                        {!isConnected ? (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 mx-auto mb-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-semibold text-white mb-3">
                                    Connect Your Calendar
                                </h3>
                                <p className="text-gray-300 mb-6">
                                    Link your Google Calendar to see events and stay organized
                                </p>

                                <button
                                    onClick={connectCalendar}
                                    className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
                                >
                                    Connect Google Calendar
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-2xl font-bold text-white">
                                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openCreateModal()}
                                            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition text-white font-semibold"
                                        >
                                            + Create Event
                                        </button>
                                        <button
                                            onClick={() => changeMonth(-1)}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white font-semibold"
                                        >
                                            ‹ Prev
                                        </button>
                                        <button
                                            onClick={() => setCurrentDate(new Date())}
                                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition text-white font-semibold"
                                        >
                                            Today
                                        </button>
                                        <button
                                            onClick={() => changeMonth(1)}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white font-semibold"
                                        >
                                            Next ›
                                        </button>
                                    </div>
                                </div>

                                {saveMessage && (
                                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-200 text-center">
                                        {saveMessage}
                                    </div>
                                )}

                                {/* Feature 4: Search Input */}
                                {/* Allows users to filter events by searching in event titles */}
                                <div className="mb-6">
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="🔍 Search events by title..."
                                                className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                            {/* Show X button to clear search when there's text */}
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                                    title="Clear search"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        {/* Show filtered count when searching */}
                                        {searchQuery && (
                                            <div className="text-sm text-gray-300 whitespace-nowrap">
                                                {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-2 mb-3">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="text-center text-sm font-bold text-gray-300 p-2">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-2 mb-3">
                                    {renderCalendar()}
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                        <span className="text-sm text-gray-300">Connected to Google Calendar</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={fetchEvents}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                                        >
                                            Refresh
                                        </button>
                                        <button
                                            onClick={disconnectCalendar}
                                            className="px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Event Modal */}
            {isEventModalOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-6 z-50"
                    onClick={closeModal}
                >
                    <div
                        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-white">
                                {modalMode === 'create' ? 'Create Event' : 'Edit Event'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">
                                    Event Title
                                </label>
                                <input
                                    type="text"
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    placeholder="Enter event title"
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">
                                    Start Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={eventStart}
                                    onChange={(e) => setEventStart(e.target.value)}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">
                                    End Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={eventEnd}
                                    onChange={(e) => setEventEnd(e.target.value)}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                {modalMode === 'create' ? (
                                    <button
                                        onClick={handleCreateEvent}
                                        className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
                                    >
                                        Create Event
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleUpdateEvent}
                                        className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
                                    >
                                        Update Event
                                    </button>
                                )}
                                <button
                                    onClick={closeModal}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
