'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { VoiceRecognition } from '@/utils/voice-recognition';

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [eventInput, setEventInput] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition | null>(null);
  const [parsedEvent, setParsedEvent] = useState<any>(null);

  useEffect(() => {
    // Initialize voice recognition
    if (typeof window !== 'undefined') {
      setVoiceRecognition(new VoiceRecognition());
    }
    
    // Load calendar events when session is authenticated
    if (status === 'authenticated') {
      loadEvents();
    }
    
    return () => {
      if (voiceRecognition && isListening) {
        voiceRecognition.stop();
      }
    };
  }, [status]);

  async function loadEvents() {
    setLoading(true);
    try {
      // Calculate date range for this week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      
      const timeMin = startOfWeek.toISOString();
      const timeMax = endOfWeek.toISOString();
      
      const response = await fetch(
        `/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch calendar events');
      
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleListening = () => {
    if (!voiceRecognition) return;
    
    if (isListening) {
      voiceRecognition.stop();
      setIsListening(false);
    } else {
      voiceRecognition.start((transcript) => {
        setEventInput(transcript);
      }, () => {
        setIsListening(false);
      });
      setIsListening(true);
    }
  };

  const handleParseEvent = async () => {
    if (!eventInput) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'parseEvent',
          content: eventInput,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to parse event');
      
      const data = await response.json();
      setParsedEvent(data.event);
    } catch (error) {
      console.error('Error parsing event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!parsedEvent) return;
    
    setLoading(true);
    try {
      // Convert date and times to proper format
      const { title, date, startTime, endTime, description, attendees } = parsedEvent;
      
      // Parse date and time strings to create ISO strings
      const eventDate = new Date(date);
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      const startDateTime = new Date(eventDate);
      startDateTime.setHours(startHour, startMinute, 0);
      
      const endDateTime = new Date(eventDate);
      endDateTime.setHours(endHour, endMinute, 0);
      
      // Format attendees if provided
      const attendeeList = attendees ? 
        attendees.split(',').map((email: string) => ({ email: email.trim() })) : 
        undefined;
      
      // Create the event via API
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: title,
          description,
          start: { 
            dateTime: startDateTime.toISOString(), 
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
          },
          end: { 
            dateTime: endDateTime.toISOString(), 
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
          },
          attendees: attendeeList,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create event');
      
      // Reset state and reload events
      setEventInput('');
      setParsedEvent(null);
      alert('Event created successfully!');
      loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold mb-4">Calendar Management</h1>
        <p className="mb-4">Loading...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold mb-4">Calendar Management</h1>
        <p className="mb-4">Please sign in with Google to access your calendar.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Calendar Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Creation */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Create New Event</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe your event
              </label>
              <div className="flex items-center">
                <textarea
                  value={eventInput}
                  onChange={(e) => setEventInput(e.target.value)}
                  placeholder="e.g., Schedule a team meeting tomorrow at 2 PM for 1 hour to discuss the new project"
                  rows={4}
                  className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={toggleListening}
                className={`px-4 py-2 rounded text-white ${
                  isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isListening ? 'Stop Recording' : 'Record Voice'}
              </button>
              <button
                onClick={handleParseEvent}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                disabled={!eventInput || loading}
              >
                Parse Event
              </button>
            </div>
            
            {parsedEvent && (
              <div className="mt-6 border rounded-md p-4 bg-gray-50">
                <h3 className="font-medium mb-2">Parsed Event Details</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Title:</span> {parsedEvent.title}</p>
                  <p><span className="font-medium">Date:</span> {parsedEvent.date}</p>
                  <p><span className="font-medium">Time:</span> {parsedEvent.startTime} - {parsedEvent.endTime}</p>
                  <p><span className="font-medium">Description:</span> {parsedEvent.description}</p>
                  {parsedEvent.attendees && (
                    <p><span className="font-medium">Attendees:</span> {parsedEvent.attendees}</p>
                  )}
                  <button
                    onClick={handleCreateEvent}
                    className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={loading}
                  >
                    Create Event
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Calendar Events */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
          
          {loading && !events.length ? (
            <p className="text-gray-500">Loading events...</p>
          ) : events.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {events.map((event) => (
                <li key={event.id} className="py-3">
                  <div className="flex justify-between">
                    <p className="font-medium">{event.summary}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(event.start.dateTime).toLocaleTimeString([], { 
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(event.start.dateTime).toLocaleDateString()}
                  </p>
                  {event.description && (
                    <p className="text-sm mt-1 text-gray-600">{event.description}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No upcoming events.</p>
          )}
        </div>
      </div>
    </div>
  );
} 