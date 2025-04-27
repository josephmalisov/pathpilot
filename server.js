require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 5001;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://pathpilot-frontend.onrender.com', 'https://pathpilot.onrender.com'] 
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Define assistant IDs
const ASSISTANTS = {
  'path-planner': 'asst_c4kI5II18ObMEAfs5fAxDSPH',  // Existing Path Planner assistant
  'atomic-habits': 'asst_u1UIib7yww7O7AzxHy5rBBpx'  // Atomic Habits assistant
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 