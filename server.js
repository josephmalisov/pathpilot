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
    ? ['https://pathpilot.onrender.com', 'https://pathpilot-backend.onrender.com'] 
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Use the specific Assistant ID
const ASSISTANT_ID = 'asst_c4kI5II18ObMEAfs5fAxDSPH';

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
    const { prompt, threadId } = req.body;
    
    // Use existing thread or create a new one
    let thread;
    if (threadId) {
      thread = { id: threadId };
    } else {
      thread = await openai.beta.threads.create();
    }
    
    // Add the user's message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: prompt
    });
    
    // Run the assistant with function calling enabled
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
      tools: [{ type: "function", function: functions[0] }]
    });
    
    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }
    
    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    
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
    
    // Send response with thread ID
    res.json({
      response,
      isComplete,
      threadId: thread.id
    });
    
    // Only delete the thread if the conversation is complete
    // if (isComplete) {
    //   await openai.beta.threads.del(thread.id);
    // }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 