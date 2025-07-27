import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  Event as EventIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Description as DescriptionIcon,
  Google as GoogleIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Calendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    summary: '',
    description: '',
    startTime: '',
    endTime: '',
    location: ''
  });

  // Check if user has connected Google Calendar
  useEffect(() => {
    checkCalendarConnection();
  }, []);

  const checkCalendarConnection = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/calendar/calendars`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsConnected(true);
      fetchEvents();
    } catch (error) {
      setIsConnected(false);
      console.log('Calendar not connected');
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      console.log('Requesting Google auth URL...');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/google`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      console.log('Received auth URL:', response.data.authUrl);
      
      // Open Google OAuth in new window
      const authWindow = window.open(
        response.data.authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        setError('Popup blocked! Please allow popups for this site and try again.');
        setLoading(false);
        return;
      }

      // Listen for the callback
      let checkCount = 0;
      const maxChecks = 150; // 5 minutes with 2-second intervals
      
      const checkAuth = setInterval(async () => {
        checkCount++;
        console.log(`Checking auth status... (attempt ${checkCount}/${maxChecks})`);
        
        try {
          const checkResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/calendar/calendars`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          console.log('Calendar connection successful!');
          clearInterval(checkAuth);
          authWindow.close();
          setIsConnected(true);
          fetchEvents();
          setLoading(false);
        } catch (error) {
          console.log('Still not connected, continuing to check...');
          
          if (checkCount >= maxChecks) {
            console.log('Max checks reached, stopping...');
            clearInterval(checkAuth);
            authWindow.close();
            setError('Connection timeout. Please try again.');
            setLoading(false);
          }
        }
      }, 2000);

      // Also listen for window close
      const checkWindowClosed = setInterval(() => {
        if (authWindow.closed) {
          console.log('Auth window was closed by user');
          clearInterval(checkAuth);
          clearInterval(checkWindowClosed);
          setLoading(false);
        }
      }, 1000);

    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      setError(`Failed to connect Google Calendar: ${error.response?.data?.error || error.message}`);
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/calendar/events`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: {
          maxResults: 20,
          timeMin: new Date().toISOString()
        }
      });
      setEvents(response.data.events || []);
    } catch (error) {
      setError('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setEventForm({
      summary: '',
      description: '',
      startTime: '',
      endTime: '',
      location: ''
    });
    setShowEventDialog(true);
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setEventForm({
      summary: event.summary || '',
      description: event.description || '',
      startTime: event.start?.dateTime ? new Date(event.start.dateTime).toISOString().slice(0, 16) : '',
      endTime: event.end?.dateTime ? new Date(event.end.dateTime).toISOString().slice(0, 16) : '',
      location: event.location || ''
    });
    setShowEventDialog(true);
  };

  const handleSaveEvent = async () => {
    try {
      setLoading(true);
      const eventData = {
        summary: eventForm.summary,
        description: eventForm.description,
        startTime: new Date(eventForm.startTime).toISOString(),
        endTime: new Date(eventForm.endTime).toISOString(),
        location: eventForm.location
      };

      if (selectedEvent) {
        // Update existing event
        await axios.put(`${process.env.REACT_APP_API_URL}/api/calendar/events/${selectedEvent.id}`, eventData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        // Create new event
        await axios.post(`${process.env.REACT_APP_API_URL}/api/calendar/events`, eventData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      setShowEventDialog(false);
      fetchEvents();
    } catch (error) {
      setError('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        setLoading(true);
        await axios.delete(`${process.env.REACT_APP_API_URL}/api/calendar/events/${eventId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchEvents();
      } catch (error) {
        setError('Failed to delete event');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatEventTime = (dateTime) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString();
  };

  const getEventColor = (colorId) => {
    const colors = {
      '1': '#7986cb', // Blue
      '2': '#33b679', // Green
      '3': '#8b6b9b', // Purple
      '4': '#e67c73', // Red
      '5': '#f6c026', // Yellow
      '6': '#f28b53', // Orange
      '7': '#039be5', // Light Blue
      '8': '#616161', // Grey
      '9': '#3f51b5', // Dark Blue
      '10': '#0b8043', // Dark Green
      '11': '#d60000'  // Dark Red
    };
    return colors[colorId] || colors['1'];
  };

  if (!isConnected) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <GoogleIcon sx={{ fontSize: 60, color: '#4285f4', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Connect Google Calendar
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Connect your Google Calendar to schedule tasks and events from your AI conversations.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={connectGoogleCalendar}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <GoogleIcon />}
          >
            {loading ? 'Connecting...' : 'Connect Google Calendar'}
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            onClick={() => {
              const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&prompt=consent&response_type=code&client_id=923778376014-54vibco1hi4edemducqu9vdkg9t2hi1c.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A5001%2Fapi%2Fauth%2Fgoogle%2Fcallback';
              window.open(authUrl, '_blank');
            }}
            sx={{ mt: 2 }}
          >
            Test Direct OAuth Link
          </Button>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Calendar
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateEvent}
        >
          Add Event
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {events.map((event) => (
            <Grid item xs={12} md={6} lg={4} key={event.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderLeft: `4px solid ${getEventColor(event.colorId)}`
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                      {event.summary}
                    </Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleEditEvent(event)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteEvent(event.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  {event.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {event.description}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ScheduleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatEventTime(event.start?.dateTime)}
                    </Typography>
                  </Box>
                  
                  {event.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {event.location}
                      </Typography>
                    </Box>
                  )}
                  
                  {event.attendees && event.attendees.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Attendees: {event.attendees.length}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {events.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <EventIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No upcoming events
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first event to get started.
          </Typography>
        </Paper>
      )}

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onClose={() => setShowEventDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedEvent ? 'Edit Event' : 'Create Event'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Event Title"
            value={eventForm.summary}
            onChange={(e) => setEventForm({ ...eventForm, summary: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={eventForm.description}
            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="Location"
            value={eventForm.location}
            onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Start Time"
            type="datetime-local"
            value={eventForm.startTime}
            onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="End Time"
            type="datetime-local"
            value={eventForm.endTime}
            onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEventDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEvent} 
            variant="contained"
            disabled={!eventForm.summary || !eventForm.startTime || !eventForm.endTime}
          >
            {selectedEvent ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar; 