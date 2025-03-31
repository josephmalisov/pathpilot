import React, { useState, useRef, useEffect } from 'react';
import { 
  Container, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Box,
  CircularProgress,
  ThemeProvider,
  createTheme,
  List,
  ListItem,
  ListItemText,
  Divider,
  CssBaseline,
  ButtonGroup
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { generatePDF } from './utils/pdfGenerator';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: 'Helvetica, Arial, sans-serif',
    allVariants: {
      fontFamily: 'Helvetica, Arial, sans-serif',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.5)',
            },
          },
        },
      },
    },
  },
});

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messageHistory, setMessageHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [pathPlanComplete, setPathPlanComplete] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Add useEffect for auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add new useEffect for input changes
  useEffect(() => {
    scrollToBottom();
  }, [input]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError('');
    setPathPlanComplete(false);
    
    // Add user message to chat and history
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setMessageHistory(prev => [userMessage, ...prev]);
    setHistoryIndex(-1);

    try {
      const result = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/decide`, { 
        prompt: userMessage,
        threadId 
      });
      setMessages(prev => [...prev, { type: 'assistant', content: result.data.response }]);
      setPathPlanComplete(result.data.isComplete);
      setThreadId(result.data.threadId);
    } catch (err) {
      setError('Failed to get response. Please try again.');
      console.error('Error:', err);
      // Reset thread ID if we get a thread not found error
      if (err.response?.data?.error?.message?.includes('No thread found')) {
        setThreadId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (messageHistory.length > 0 && historyIndex < messageHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(messageHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(messageHistory[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleExportPDF = (content) => {
    // Generate PDF with the given content
    generatePDF(content, {
      title: 'Your PathPilot Plan',
      subtitle: new Date().toLocaleDateString()
    });
  };

  const renderMessage = (message, index) => {
    const isUser = message.type === 'user';
    const isAssistant = message.type === 'assistant';
    const isSystem = message.type === 'system';

    if (isSystem) return null;

    return (
      <Box
        key={index}
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          mb: 2,
          mt: 0,
        }}
      >
        <Box
          sx={{
            maxWidth: '80%',
            backgroundColor: isUser ? 'rgba(144, 202, 249, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: isUser ? 'white' : 'text.primary',
            borderRadius: 2,
            p: 2,
            position: 'relative',
            border: 'none',
          }}
        >
          <Typography
            component="div"
            sx={{
              whiteSpace: 'pre-wrap',
              fontSize: '0.95em',
              '& p': { mb: 0.15, lineHeight: 1.2 },
              '& ul, & ol': { pl: 1.25, mb: 0.15 },
              '& li': { mb: 0.1, lineHeight: 1.2 },
              '& h1, & h2, & h3, & h4, & h5, & h6': { 
                color: isUser ? 'white' : 'primary.main',
                mt: 0.15,
                mb: 0.15,
                fontWeight: 'bold',
                lineHeight: 1.2,
                fontSize: '1.1em'
              },
              '& code': {
                backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                padding: '0 2px',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.8em'
              },
              '& blockquote': {
                borderLeft: `2px solid ${isUser ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}`,
                pl: 0.75,
                ml: 0,
                fontStyle: 'italic',
                my: 0.15
              },
            }}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            {message.type === 'assistant' && message.content.includes('**PathPlan:') && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleExportPDF(message.content)}
                sx={{ 
                  color: 'primary.main',
                  borderColor: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(144, 202, 249, 0.15)',
                  },
                }}
              >
                Export Plan
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            align="center" 
            sx={{ 
              color: 'primary.main',
              fontFamily: 'Garamond, serif'
            }}
          >
            PathPilot
          </Typography>
          
          <Paper 
            elevation={3} 
            sx={{ 
              p: 2, 
              height: '60vh', 
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {messages.map((message, index) => (
                <ListItem key={index} sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: message.type === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2
                }}>
                  <Box sx={{ 
                    maxWidth: '80%',
                    backgroundColor: message.type === 'user' ? 'rgba(144, 202, 249, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: message.type === 'user' ? 'white' : 'text.primary',
                    borderRadius: 2,
                    p: 2,
                    position: 'relative',
                    border: 'none',
                  }}>
                    <Typography
                      component="div"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.95em',
                        '& p': { mb: 0.15, lineHeight: 1.2 },
                        '& ul, & ol': { pl: 1.25, mb: 0.15 },
                        '& li': { mb: 0.1, lineHeight: 1.2 },
                        '& h1, & h2, & h3, & h4, & h5, & h6': { 
                          color: message.type === 'user' ? 'white' : 'primary.main',
                          mt: 0.15,
                          mb: 0.15,
                          fontWeight: 'bold',
                          lineHeight: 1.2,
                          fontSize: '1.1em'
                        },
                        '& code': {
                          backgroundColor: message.type === 'user' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          padding: '0 2px',
                          borderRadius: 1,
                          fontFamily: 'monospace',
                          fontSize: '0.8em'
                        },
                        '& blockquote': {
                          borderLeft: `2px solid ${message.type === 'user' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}`,
                          pl: 0.75,
                          ml: 0,
                          fontStyle: 'italic',
                          my: 0.15
                        },
                      }}
                    >
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      {message.type === 'assistant' && message.content.includes('**PathPlan:') && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleExportPDF(message.content)}
                          sx={{ 
                            color: 'primary.main',
                            borderColor: 'primary.main',
                            '&:hover': {
                              borderColor: 'primary.main',
                              backgroundColor: 'rgba(144, 202, 249, 0.15)',
                            },
                          }}
                        >
                          Export Plan
                        </Button>
                      )}
                    </Box>
                  </Box>
                </ListItem>
              ))}
              {loading && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} sx={{ color: 'secondary.main' }} />
                        <Typography>Thinking...</Typography>
                      </Box>
                    }
                  />
                </ListItem>
              )}
              <div ref={messagesEndRef} />
            </List>
          </Paper>

          {error && (
            <Paper elevation={3} sx={{ p: 2, mb: 2, bgcolor: 'error.dark' }}>
              <Typography color="error">{error}</Typography>
            </Paper>
          )}

          <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper' }}>
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={12}
                variant="outlined"
                label="Type your message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your decision-making scenario... (Press Enter to send, Shift+Enter for new line, ↑/↓ for history)"
                sx={{ mb: 2 }}
                inputRef={inputRef}
              />
              <ButtonGroup fullWidth variant="contained" sx={{ gap: 1 }}>
                <Button
                  type="submit"
                  disabled={loading || !input.trim()}
                  sx={{
                    flex: 1,
                    bgcolor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  Send
                </Button>
              </ButtonGroup>
            </form>
          </Paper>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
