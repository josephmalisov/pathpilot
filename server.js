require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const GoogleCalendarService = require('./googleCalendarService');

const app = express();
const port = process.env.PORT || 5001;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Supabase with secret key for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://pathpilot-frontend.onrender.com', 'https://pathpilot.onrender.com'] 
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Define assistant IDs
const ASSISTANTS = {
  'path-planner': 'asst_c4kI5II18ObMEAfs5fAxDSPH',  // Existing Path Planner assistant
  'atomic-habits': 'asst_u1UIib7yww7O7AzxHy5rBBpx',  // Atomic Habits assistant
  'essentialist': 'asst_4dmqCKLko93MgdG1cypeQzPX',  // Essentialist assistant
  'flow-zone': 'asst_ObFtpR5KEiBg4kljLw0BN2fb'  // Flow Zone assistant
};

// Define the function that indicates completion
const functions = [
  {
    name: "PathPlan_response",
    description: "Indicates that this message contains a pathplan",
    parameters: {
      type: "object",
      properties: {
        is_pathPlan: {
          type: "boolean",
          description: "Whether this message contains a pathplan"
        }
      },
      required: ["is_pathPlan"]
    }
  }
];

// Function to parse function calls from message content
function parseFunctionCall(content) {
  console.log('Parsing content:', content);
  const functionCallMatch = content.match(/<function_calls>.*?<\/function_calls>/s);
  if (!functionCallMatch) {
    console.log('No function calls found in content');
    return null;
  }
  console.log('Found function call:', functionCallMatch[0]);

  const invokeMatch = functionCallMatch[0].match(/<invoke name="(.*?)">/);
  if (!invokeMatch) {
    console.log('No invoke match found');
    return null;
  }
  console.log('Found invoke name:', invokeMatch[1]);

  const paramMatch = functionCallMatch[0].match(/<parameter name="(.*?)">(.*?)<\/parameter>/);
  if (!paramMatch) {
    console.log('No parameter match found');
    return null;
  }
  console.log('Found parameter:', paramMatch[1], '=', paramMatch[2]);

  return {
    name: invokeMatch[1],
    parameters: {
      [paramMatch[1]]: paramMatch[2] === 'true'
    }
  };
}

// Function to clean response content
function cleanResponse(content) {
  // Remove any function calls at the end of the message
  return content.replace(/\s*<function_calls>[\s\S]*?<\/function_calls>\s*$/, '').trim();
}

// User registration endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user using admin client to bypass RLS
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          name
        }
      ])
      .select('id, email, name')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user using admin client to bypass RLS
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, password, name')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile endpoint
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save chat session endpoint
app.post('/api/chats', authenticateToken, async (req, res) => {
  try {
    const { title, messages, assistantId, threadId } = req.body;

    if (!title || !messages || !assistantId) {
      return res.status(400).json({ error: 'Title, messages, and assistantId are required' });
    }

    const { data: chat, error } = await supabaseAdmin
      .from('chats')
      .insert([
        {
          user_id: req.user.userId,
          title,
          messages: JSON.stringify(messages),
          assistant_id: assistantId,
          thread_id: threadId
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Save chat error:', error);
      return res.status(500).json({ error: 'Failed to save chat' });
    }

    res.json({ chat });
  } catch (error) {
    console.error('Save chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's chat history endpoint
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const { data: chats, error } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get chats error:', error);
      return res.status(500).json({ error: 'Failed to get chats' });
    }

    // Parse messages for each chat
    const chatsWithParsedMessages = chats.map(chat => ({
      ...chat,
      messages: JSON.parse(chat.messages)
    }));

    res.json({ chats: chatsWithParsedMessages });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific chat endpoint
app.get('/api/chats/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;

    const { data: chat, error } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', req.user.userId)
      .single();

    if (error || !chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Parse messages
    chat.messages = JSON.parse(chat.messages);

    res.json({ chat });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete chat endpoint
app.delete('/api/chats/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;

    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', req.user.userId);

    if (error) {
      console.error('Delete chat error:', error);
      return res.status(500).json({ error: 'Failed to delete chat' });
    }

    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get AI assistance for decision making
app.post('/api/decide', async (req, res) => {
  try {
    console.log('Received request:', {
      body: req.body,
      headers: req.headers,
      url: req.url
    });

    const { prompt, threadId, assistantId = 'path-planner' } = req.body;
    
    // Get the appropriate assistant ID
    const selectedAssistantId = ASSISTANTS[assistantId];
    if (!selectedAssistantId) {
      throw new Error(`Invalid assistant ID: ${assistantId}`);
    }

    // Use existing thread or create a new one
    let thread;
    if (threadId) {
      console.log('Using existing thread:', threadId);
      thread = { id: threadId };
    } else {
      console.log('Creating new thread');
      thread = await openai.beta.threads.create();
      console.log('Created new thread:', thread.id);
    }
    
    // Add the user's message to the thread
    console.log('Adding message to thread:', { threadId: thread.id, prompt });
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: prompt
    });
    
    // Run the assistant with function calling enabled
    console.log('Creating run with assistant:', selectedAssistantId);
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: selectedAssistantId,
      tools: [{ type: "function", function: functions[0] }]
    });
    console.log('Created run:', run.id);
    
    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    console.log('Initial run status:', runStatus.status);
    
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log('Updated run status:', runStatus.status);
    }
    
    if (runStatus.status === 'failed') {
      console.error('Run failed:', runStatus.last_error);
      throw new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }
    
    // Get the assistant's response
    console.log('Retrieving messages for thread:', thread.id);
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    console.log('Last message:', lastMessage);
    
    // Parse the function call and clean the response
    let isComplete = false;
    let response = '';
    if (lastMessage.content[0].type === 'text') {
      const rawMessage = lastMessage.content[0].text.value;
      console.log('Processing raw message:', rawMessage);
      
      const functionCall = parseFunctionCall(rawMessage);
      if (functionCall && functionCall.name === 'PathPlan_response') {
        isComplete = functionCall.parameters.is_pathPlan;
        console.log('PathPlan_response function detected:', {
          is_pathPlan: isComplete,
          rawFunctionCall: rawMessage.match(/<function_calls>.*?<\/function_calls>/s)?.[0]
        });
      } else {
        console.log('No PathPlan_response function found in message');
      }
      
      response = cleanResponse(rawMessage);
    }
    
    console.log('Sending response:', { response, isComplete, threadId: thread.id });
    // Send response with thread ID
    res.json({
      response,
      isComplete,
      threadId: thread.id
    });
    
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || 'No additional details available'
    });
  }
});

// Google Calendar API Endpoints

// Initialize Google Calendar service
const calendarService = new GoogleCalendarService();

// Get Google Calendar authorization URL
app.get('/api/auth/google', authenticateToken, (req, res) => {
  try {
    console.log('Generating auth URL for user:', req.user.userId);
    const authUrl = calendarService.getAuthUrl(req.user.userId);
    console.log('Generated auth URL:', authUrl);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// Test endpoint for debugging (no auth required)
app.get('/api/auth/google/test', (req, res) => {
  try {
    const authUrl = calendarService.getAuthUrl();
    res.json({ authUrl, message: 'Test endpoint working' });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});



// Handle Google Calendar OAuth callback
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    console.log('OAuth callback received:', req.query);
    const { code, state } = req.query;
    
    if (!code) {
      console.error('No authorization code received');
      return res.status(400).json({ error: 'Authorization code required' });
    }

    if (!state) {
      console.error('No state parameter received');
      return res.status(400).json({ error: 'State parameter required' });
    }

    const userId = state; // Extract user ID from state parameter
    console.log('Processing callback for user:', userId);

    console.log('Exchanging code for tokens...');
    const tokens = await calendarService.getTokensFromCode(code);
    console.log('Tokens received successfully');
    
    // Store tokens in Supabase for the user
    console.log('Storing tokens for user:', userId);
    
    // First check if user already has tokens
    const { data: existingToken, error: checkError } = await supabaseAdmin
      .from('user_calendar_tokens')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    let error;
    if (existingToken) {
      // Update existing tokens
      console.log('Updating existing tokens for user:', userId);
      const { error: updateError } = await supabaseAdmin
        .from('user_calendar_tokens')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: new Date(tokens.expiry_date).toISOString()
        })
        .eq('user_id', userId);
      error = updateError;
    } else {
      // Insert new tokens
      console.log('Inserting new tokens for user:', userId);
      const { error: insertError } = await supabaseAdmin
        .from('user_calendar_tokens')
        .insert({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: new Date(tokens.expiry_date).toISOString()
        });
      error = insertError;
    }

    if (error) {
      console.error('Error storing tokens:', error);
      return res.status(500).json({ error: 'Failed to store tokens' });
    }

    console.log('Tokens stored successfully');
    
    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      console.error('FRONTEND_URL environment variable not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    res.redirect(`${frontendUrl}/?connected=true`);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    
    // Redirect to frontend with error
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      console.error('FRONTEND_URL environment variable not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    res.redirect(`${frontendUrl}/?error=connection_failed`);
  }
});

// Get user's calendars
app.get('/api/calendar/calendars', authenticateToken, async (req, res) => {
  try {
    // Get user's stored tokens
    const { data: tokenData, error } = await supabase
      .from('user_calendar_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', req.user.userId)
      .single();

    if (error || !tokenData) {
      return res.status(401).json({ error: 'Calendar not connected' });
    }

    calendarService.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const calendars = await calendarService.getCalendars();
    res.json({ calendars });
  } catch (error) {
    console.error('Error getting calendars:', error);
    res.status(500).json({ error: 'Failed to get calendars' });
  }
});

// Get calendar events
app.get('/api/calendar/events', authenticateToken, async (req, res) => {
  try {
    const { calendarId = 'primary', timeMin, maxResults = 10 } = req.query;
    
    // Get user's stored tokens
    const { data: tokenData, error } = await supabase
      .from('user_calendar_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', req.user.userId)
      .single();

    if (error || !tokenData) {
      return res.status(401).json({ error: 'Calendar not connected' });
    }

    calendarService.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const startTime = timeMin ? new Date(timeMin) : new Date();
    const events = await calendarService.getEvents(calendarId, startTime, maxResults);
    res.json({ events });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Create calendar event
app.post('/api/calendar/events', authenticateToken, async (req, res) => {
  try {
    const { summary, description, startTime, endTime, timeZone, colorId } = req.body;
    
    if (!summary || !startTime || !endTime) {
      return res.status(400).json({ error: 'Summary, startTime, and endTime are required' });
    }

    // Get user's stored tokens
    const { data: tokenData, error } = await supabase
      .from('user_calendar_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', req.user.userId)
      .single();

    if (error || !tokenData) {
      return res.status(401).json({ error: 'Calendar not connected' });
    }

    calendarService.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const eventData = {
      summary,
      description,
      startTime,
      endTime,
      timeZone: timeZone || 'UTC',
      colorId
    };

    const event = await calendarService.createEvent(eventData);
    res.json({ event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Create recurring event (for habits)
app.post('/api/calendar/recurring-events', authenticateToken, async (req, res) => {
  try {
    const { summary, description, startTime, endTime, timeZone, colorId, recurrence } = req.body;
    
    if (!summary || !startTime || !endTime || !recurrence) {
      return res.status(400).json({ error: 'Summary, startTime, endTime, and recurrence are required' });
    }

    // Get user's stored tokens
    const { data: tokenData, error } = await supabase
      .from('user_calendar_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', req.user.userId)
      .single();

    if (error || !tokenData) {
      return res.status(401).json({ error: 'Calendar not connected' });
    }

    calendarService.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const eventData = {
      summary,
      description,
      startTime,
      endTime,
      timeZone: timeZone || 'UTC',
      colorId,
      recurrence
    };

    const event = await calendarService.createRecurringEvent(eventData);
    res.json({ event });
  } catch (error) {
    console.error('Error creating recurring event:', error);
    res.status(500).json({ error: 'Failed to create recurring event' });
  }
});

// Get free/busy information
app.get('/api/calendar/free-busy', authenticateToken, async (req, res) => {
  try {
    const { timeMin, timeMax, calendarId = 'primary' } = req.query;
    
    if (!timeMin || !timeMax) {
      return res.status(400).json({ error: 'timeMin and timeMax are required' });
    }

    // Get user's stored tokens
    const { data: tokenData, error } = await supabase
      .from('user_calendar_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', req.user.userId)
      .single();

    if (error || !tokenData) {
      return res.status(401).json({ error: 'Calendar not connected' });
    }

    calendarService.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const freeBusy = await calendarService.getFreeBusy(timeMin, timeMax, calendarId);
    res.json({ freeBusy });
  } catch (error) {
    console.error('Error getting free/busy info:', error);
    res.status(500).json({ error: 'Failed to get free/busy information' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 