import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  colorId?: string;
}

export default function MiniCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkConnectionStatus();
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
      }
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
    } catch (error) {
      setIsConnected(false);
    }
  };

  const handleClick = () => {
    navigate('/calendar');
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="animate-pulse">
          <div className="h-32 bg-white/10 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 cursor-pointer hover:bg-white/15 hover:border-orange-500/50 transition-all duration-200 shadow-xl"
    >
      <div className="text-center text-white">
        <div className="text-5xl font-bold mb-2">{new Date().getDate()}</div>
        <div className="text-sm uppercase tracking-wider text-gray-300">
          {new Date().toLocaleDateString('en-US', { month: 'long' })}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {new Date().getFullYear()}
        </div>
      </div>

      {isConnected && events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-center gap-2">
            <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-300">{events.length} event{events.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <div className="text-xs text-gray-400">Click to view</div>
        </div>
      )}
    </div>
  );
}