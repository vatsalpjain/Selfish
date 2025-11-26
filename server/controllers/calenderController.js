import { google } from 'googleapis';
import CalendarToken from '../models/CalenderToken.js'; 

// ============================================
// Feature 5: Auto-Refresh Token Helper
// ============================================
// This helper function checks if the access token is expired
// and automatically refreshes it using the refresh token.
// This prevents users from having to reconnect their calendar
// every time the access token expires (typically after 1 hour).
const refreshTokenIfNeeded = async (userId) => {
  try {
    // Get the stored token data from database
    const tokenData = await CalendarToken.findOne({ userId });
    
    if (!tokenData) {
      // No token found - user needs to connect calendar
      return null;
    }

    // Check if token is expired or will expire in the next 5 minutes
    // expiryDate is stored as timestamp in milliseconds
    const now = Date.now();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    const isExpired = tokenData.expiryDate && (tokenData.expiryDate <= now + expiryBuffer);

    if (isExpired) {
      console.log('Access token expired or expiring soon, refreshing...');
      
      // Set up OAuth client with existing credentials
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
      );

      // Use the refresh token to get new access token
      oauth2Client.setCredentials({
        refresh_token: tokenData.refreshToken
      });

      // Request new access token from Google
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update database with new access token and expiry
      tokenData.accessToken = credentials.access_token;
      tokenData.expiryDate = credentials.expiry_date;
      
      // If Google provides a new refresh token, update it too
      if (credentials.refresh_token) {
        tokenData.refreshToken = credentials.refresh_token;
      }
      
      await tokenData.save();
      console.log('Token refreshed successfully');
    }

    // Return the valid (possibly refreshed) token data
    return tokenData;
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    // If refresh fails, the refresh token might be invalid/revoked
    // Return null so the function will ask user to reconnect
    return null;
  }
};
// ============================================


// @desc    Generate Google OAuth URL
// @route   GET /api/calendar/auth/google
// @access  Public
export const getGoogleAuthUrl = (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: req.user._id.toString()
    });
    
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Handle Google OAuth callback
// @route   GET /api/calendar/auth/google/callback
// @access  Public
export const handleGoogleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect('http://localhost:5173/dashboard?calendar=error');
    }
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    
    const { tokens } = await oauth2Client.getToken(code);
    
    await CalendarToken.findOneAndUpdate(
      { userId: state },
      { 
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date
      },
      { upsert: true, new: true }
    );
    
    res.redirect('http://localhost:5173/dashboard?calendar=connected');
  } catch (error) {
    res.redirect('http://localhost:5173/dashboard?calendar=error');
  }
};

// @desc    Get calendar events
// @route   GET /api/calendar/events
// @access  Protected
export const getCalendarEvents = async (req, res) => {
  try {
    // Feature 5: Auto-refresh token before fetching events
    // This checks if token is expired and refreshes it automatically
    const tokenData = await refreshTokenIfNeeded(req.user._id);
    
    if (!tokenData) {
      // Token refresh failed or no token exists
      // Ask user to reconnect their calendar
      return res.status(401).json({ 
        message: 'Google Calendar not connected. Please reconnect.',
        connected: false,
        needsReconnect: true 
      });
    }
    
    // Set up OAuth client with the valid (possibly refreshed) token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    
    oauth2Client.setCredentials({
      access_token: tokenData.accessToken,
      refresh_token: tokenData.refreshToken
    });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Fetch events from Google Calendar
    // Note: orderBy 'startTime' REQUIRES timeMin or timeMax to be set
    // Setting timeMin to 1 year ago to show both past and future events
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: oneYearAgo.toISOString(), // Show events from 1 year ago
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    res.json({
      connected: true,
      events: response.data.items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Check if calendar is connected
// @route   GET /api/calendar/status
// @access  Protected
export const getConnectionStatus = async (req, res) => {
  try {
    const tokenData = await CalendarToken.findOne({ userId: req.user._id });
    
    res.json({
      connected: !!tokenData,
      hasToken: !!tokenData?.accessToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Disconnect calendar
// @route   DELETE /api/calendar/disconnect
// @access  Protected
export const disconnectCalendar = async (req, res) => {
  try {
    await CalendarToken.findOneAndDelete({ userId: req.user._id });
    
    res.json({ message: 'Calendar disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add New Event
// @desc    Add new event
// @route   POST /api/calendar/addEvent
// @access  Protected
export const addEvent = async (req, res) => {
  try {
    const { title, start, end } = req.body;
    
    // Feature 5: Auto-refresh token before creating event
    const tokenData = await refreshTokenIfNeeded(req.user._id);
    
    if (!tokenData) {
      return res.status(401).json({ 
        message: 'Google Calendar not connected. Please reconnect.',
        connected: false,
        needsReconnect: true
      });
    }
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    
    oauth2Client.setCredentials({
      access_token: tokenData.accessToken,
      refresh_token: tokenData.refreshToken
    });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const event = await calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: title,
        start: { 
          dateTime: start,
          timeZone: 'Asia/Kolkata'
        },
        end: { 
          dateTime: end,
          timeZone: 'Asia/Kolkata'
        }
      }
    });
    
    res.json({
      connected: true,
      event: event.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Event
// @desc    Update event
// @route   PUT /api/calendar/updateEvent
// @access  Protected
export const updateEvent = async (req, res) => {
  try {
    const { eventId, title, start, end } = req.body;
    
    // Feature 5: Auto-refresh token before updating event
    const tokenData = await refreshTokenIfNeeded(req.user._id);
    
    if (!tokenData) {
      return res.status(401).json({ 
        message: 'Google Calendar not connected. Please reconnect.',
        connected: false,
        needsReconnect: true
      });
    }
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    
    oauth2Client.setCredentials({
      access_token: tokenData.accessToken,
      refresh_token: tokenData.refreshToken
    });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const event = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      resource: {
        summary: title,
        start: { 
          dateTime: start,
          timeZone: 'Asia/Kolkata'
        },
        end: { 
          dateTime: end,
          timeZone: 'Asia/Kolkata'
        }
      }
    });
    
    res.json({
      connected: true,
      event: event.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Delete Event 
// @desc    Delete event
// @route   DELETE /api/calendar/deleteEvent
// @access  Protected
export const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    
    // Feature 5: Auto-refresh token before deleting event
    const tokenData = await refreshTokenIfNeeded(req.user._id);
    
    if (!tokenData) {
      return res.status(401).json({ 
        message: 'Google Calendar not connected. Please reconnect.',
        connected: false,
        needsReconnect: true
      });
    }
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    
    oauth2Client.setCredentials({
      access_token: tokenData.accessToken,
      refresh_token: tokenData.refreshToken
    });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId
    });
    
    res.json({
      connected: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

