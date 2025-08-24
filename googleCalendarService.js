const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    this.calendar = google.calendar({ version: 'v3' });
  }

  // Generate authorization URL
  getAuthUrl(userId) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId // Pass user ID in state parameter
    });
  }

  // Exchange authorization code for tokens
  async getTokensFromCode(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw error;
    }
  }

  // Set credentials from stored tokens
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Get user's calendars
  async getCalendars() {
    try {
      const response = await this.calendar.calendarList.list({
        auth: this.oauth2Client
      });
      return response.data.items;
    } catch (error) {
      console.error('Error getting calendars:', error);
      throw error;
    }
  }

  // Get events from a specific calendar
  async getEvents(calendarId = 'primary', timeMin = new Date(), maxResults = 10) {
    try {
      console.log('Calendar service: Getting events for calendarId:', calendarId);
      console.log('Calendar service: timeMin:', timeMin);
      console.log('Calendar service: maxResults:', maxResults);
      
      const response = await this.calendar.events.list({
        auth: this.oauth2Client,
        calendarId: calendarId,
        timeMin: timeMin.toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      console.log('Calendar service: Response received, items count:', response.data.items ? response.data.items.length : 0);
      return response.data.items;
    } catch (error) {
      console.error('Calendar service: Error getting events:', error);
      console.error('Calendar service: Error details:', error.message);
      if (error.response) {
        console.error('Calendar service: Error response:', error.response.data);
      }
      throw error;
    }
  }

  // Create a new event
  async createEvent(eventData) {
    try {
      const event = {
        summary: eventData.summary,
        description: eventData.description || '',
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timeZone || 'UTC'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timeZone || 'UTC'
        },
        colorId: eventData.colorId || '1', // Default color
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 }
          ]
        }
      };

      const response = await this.calendar.events.insert({
        auth: this.oauth2Client,
        calendarId: 'primary',
        resource: event
      });

      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // Update an existing event
  async updateEvent(eventId, eventData) {
    try {
      const event = {
        summary: eventData.summary,
        description: eventData.description || '',
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timeZone || 'UTC'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timeZone || 'UTC'
        }
      };

      const response = await this.calendar.events.update({
        auth: this.oauth2Client,
        calendarId: 'primary',
        eventId: eventId,
        resource: event
      });

      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  // Delete an event
  async deleteEvent(eventId) {
    try {
      await this.calendar.events.delete({
        auth: this.oauth2Client,
        calendarId: 'primary',
        eventId: eventId
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Get free/busy information
  async getFreeBusy(timeMin, timeMax, calendarId = 'primary') {
    try {
      const response = await this.calendar.freebusy.query({
        auth: this.oauth2Client,
        requestBody: {
          timeMin: timeMin,
          timeMax: timeMax,
          items: [{ id: calendarId }]
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting free/busy info:', error);
      throw error;
    }
  }

  // Create recurring event (for habits)
  async createRecurringEvent(eventData) {
    try {
      const event = {
        summary: eventData.summary,
        description: eventData.description || '',
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timeZone || 'UTC'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timeZone || 'UTC'
        },
        recurrence: eventData.recurrence || [],
        colorId: eventData.colorId || '1'
      };

      const response = await this.calendar.events.insert({
        auth: this.oauth2Client,
        calendarId: 'primary',
        resource: event
      });

      return response.data;
    } catch (error) {
      console.error('Error creating recurring event:', error);
      throw error;
    }
  }
}

module.exports = GoogleCalendarService; 