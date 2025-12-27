import { google } from 'googleapis';
import supabase from '../config/supabase.js';

// ============================================
// Feature 5: Auto-Refresh Token Helper
// ============================================
// This helper function checks if the access token is expired
// and automatically refreshes it using the refresh token.
// This prevents users from having to reconnect their calendar
// every time the access token expires (typically after 1 hour).
const refreshTokenIfNeeded = async (userId) => {
  try {
    // Get the stored token data from Supabase
    const { data: tokenData, error } = await supabase
      .from('calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !tokenData) {
      // No token found - user needs to connect calendar
      return null;
    }

    // Check if token is expired or will expire in the next 5 minutes
    // expiry_date is stored as bigint (milliseconds since epoch)
    const now = Date.now();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    const isExpired = tokenData.expiry_date && (tokenData.expiry_date <= now + expiryBuffer);

    if (isExpired) {
      console.log('Access token expired or expiring soon, refreshing...');
      
      // Check if refresh token exists
      if (!tokenData.refresh_token) {
        console.error('Error refreshing token: No refresh token is set.');
        console.log('User needs to reconnect Google Calendar to obtain a new refresh token.');
        return null;
      }
      
      // Set up OAuth client with existing credentials
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
      );

      // Use the refresh token to get new access token
      oauth2Client.setCredentials({
        refresh_token: tokenData.refresh_token
      });

      // Request new access token from Google
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      const updateData = {
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date  // Store as bigint (milliseconds)
      };

      // If Google provides a new refresh token, update it too
      if (credentials.refresh_token) {
        updateData.refresh_token = credentials.refresh_token;
      }

      const { data: updatedToken, error: updateError } = await supabase
        .from('calendar_tokens')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Failed to update token:', updateError);
        return null;
      }

      console.log('Token refreshed successfully');
      
      // Return updated token data
      return {
        accessToken: updatedToken.access_token,
        refreshToken: updatedToken.refresh_token,
        expiryDate: updatedToken.expiry_date  // Already bigint
      };
    }

    // Return the valid (not expired) token data
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiryDate: tokenData.expiry_date  // Already bigint
    };
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    // If refresh fails, the refresh token might be invalid/revoked
    // Return null so the function will ask user to reconnect
    return null;
  }
};

// ============================================
// HELPER: Create Calendar Event
// ============================================
// Reusable function to create a Google Calendar event
// Used by: Todo creation, Direct event creation
// Returns: { success: boolean, eventId?: string, error?: string }
export const createCalendarEventHelper = async (userId, title, start, end) => {
  try {
    // Check if user has calendar connected and refresh token if needed
    const tokenData = await refreshTokenIfNeeded(userId);
    
    if (!tokenData) {
      return { success: false, error: 'Calendar not connected' };
    }

    // Set up OAuth2 client with refreshed credentials
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

    // Create the calendar event
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

    return { success: true, eventId: event.data.id };
  } catch (error) {
    console.error('Create calendar event helper error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// HELPER: Update Calendar Event
// ============================================
// Reusable function to update an existing Google Calendar event
// Used by: Todo updates
// Returns: { success: boolean, error?: string }
export const updateCalendarEventHelper = async (userId, eventId, title, start, end) => {
  try {
    // Check if user has calendar connected and refresh token if needed
    const tokenData = await refreshTokenIfNeeded(userId);
    
    if (!tokenData) {
      return { success: false, error: 'Calendar not connected' };
    }

    // Set up OAuth2 client with refreshed credentials
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

    // Update the calendar event
    await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
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

    return { success: true };
  } catch (error) {
    console.error('Update calendar event helper error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// HELPER: Delete Calendar Event
// ============================================
// Reusable function to delete a Google Calendar event
// Used by: Todo deletion
// Returns: { success: boolean, error?: string }
export const deleteCalendarEventHelper = async (userId, eventId) => {
  try {
    // Check if user has calendar connected and refresh token if needed
    const tokenData = await refreshTokenIfNeeded(userId);
    
    if (!tokenData) {
      return { success: false, error: 'Calendar not connected' };
    }

    // Set up OAuth2 client with refreshed credentials
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

    // Delete the calendar event
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });

    return { success: true };
  } catch (error) {
    console.error('Delete calendar event helper error:', error.message);
    return { success: false, error: error.message };
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
      state: req.user.id.toString()
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
    
    // Upsert token data in Supabase
    const { error } = await supabase
      .from('calendar_tokens')
      .upsert([{
        user_id: state,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date  // Store as bigint (milliseconds)
      }], {
        onConflict: 'user_id'
      });
    
    if (error) {
      console.error('Failed to save calendar token:', error);
      return res.redirect('http://localhost:5173/dashboard?calendar=error');
    }
    
    res.redirect('http://localhost:5173/dashboard?calendar=connected');
  } catch (error) {
    console.error('OAuth callback error:', error);
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
    const tokenData = await refreshTokenIfNeeded(req.user.id);
    
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
    console.error('Get events error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Check if calendar is connected
// @route   GET /api/calendar/status
// @access  Protected
export const getConnectionStatus = async (req, res) => {
  try {
    const { data: tokenData, error } = await supabase
      .from('calendar_tokens')
      .select('access_token')
      .eq('user_id', req.user.id)
      .single();
    
    res.json({
      connected: !error && !!tokenData,
      hasToken: !!tokenData?.access_token
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
    const { error } = await supabase
      .from('calendar_tokens')
      .delete()
      .eq('user_id', req.user.id);
    
    if (error) {
      console.error('Disconnect error:', error);
      return res.status(500).json({ error: error.message });
    }
    
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
    const tokenData = await refreshTokenIfNeeded(req.user.id);
    
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
    
    // ============================================
    // AUTO-CREATE TODO FROM CALENDAR EVENT
    // ============================================
    // When user creates a calendar event, automatically create a corresponding todo
    console.log(`Calendar event created, creating corresponding todo for user ${req.user.id}`);
    
    try {
      const { data: newTodo, error: todoError } = await supabase
        .from('todos')
        .insert([{
          user_id: req.user.id,
          title: title,
          due_date: start, // Use event start time as todo due date
          priority: 'medium', // Default priority
          status: 'pending', // Default status
          calendar_event_id: event.data.id // Link to calendar event
        }])
        .select()
        .single();
      
      if (todoError) {
        console.error(`⚠ Failed to create todo: ${todoError.message}`);
        // Don't fail the calendar event creation if todo fails
      } else {
        console.log(`✓ Todo created and linked to calendar event`);
      }
    } catch (todoCreationError) {
      console.error(`⚠ Todo creation error: ${todoCreationError.message}`);
      // Don't fail the calendar event creation if todo fails
    }
    
    res.json({
      connected: true,
      event: event.data
    });
  } catch (error) {
    console.error('Add event error:', error);
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
    const tokenData = await refreshTokenIfNeeded(req.user.id);
    
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
    
    // ============================================
    // AUTO-UPDATE LINKED TODO
    // ============================================
    // When user updates a calendar event, automatically update the linked todo
    console.log(`Calendar event updated, syncing to linked todo (event ID: ${eventId})`);
    
    try {
      // Find todo linked to this calendar event
      const { data: linkedTodo, error: findError } = await supabase
        .from('todos')
        .select('*')
        .eq('calendar_event_id', eventId)
        .eq('user_id', req.user.id) // Security: ensure user owns the todo
        .single();
      
      if (findError || !linkedTodo) {
        console.log(`⚠ No linked todo found for event ${eventId}`);
      } else {
        // Update the linked todo with new title and due date
        const { error: updateError } = await supabase
          .from('todos')
          .update({
            title: title,
            due_date: start
          })
          .eq('id', linkedTodo.id);
        
        if (updateError) {
          console.error(`⚠ Failed to update linked todo: ${updateError.message}`);
        } else {
          console.log(`✓ Linked todo updated successfully`);
        }
      }
    } catch (todoUpdateError) {
      console.error(`⚠ Todo update error: ${todoUpdateError.message}`);
      // Don't fail the calendar event update if todo update fails
    }
    
    res.json({
      connected: true,
      event: event.data
    });
  } catch (error) {
    console.error('Update event error:', error);
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
    const tokenData = await refreshTokenIfNeeded(req.user.id);
    
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
    
    // ============================================
    // AUTO-DELETE LINKED TODO
    // ============================================
    // When user deletes a calendar event, automatically delete the linked todo
    console.log(`Calendar event deleted, deleting linked todo (event ID: ${eventId})`);
    
    try {
      // Find todo linked to this calendar event
      const { data: linkedTodo, error: findError } = await supabase
        .from('todos')
        .select('id')
        .eq('calendar_event_id', eventId)
        .eq('user_id', req.user.id) // Security: ensure user owns the todo
        .single();
      
      if (findError || !linkedTodo) {
        console.log(`⚠ No linked todo found for event ${eventId}`);
      } else {
        // Delete the linked todo
        const { error: deleteError } = await supabase
          .from('todos')
          .delete()
          .eq('id', linkedTodo.id);
        
        if (deleteError) {
          console.error(`⚠ Failed to delete linked todo: ${deleteError.message}`);
        } else {
          console.log(`✓ Linked todo deleted successfully`);
        }
      }
    } catch (todoDeleteError) {
      console.error(`⚠ Todo delete error: ${todoDeleteError.message}`);
      // Don't fail the calendar event deletion if todo deletion fails
    }
    
    res.json({
      connected: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: error.message });
  }
}
