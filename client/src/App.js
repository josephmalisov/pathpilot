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
  CssBaseline,
  ButtonGroup,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  History as HistoryIcon,
  Save as SaveIcon,
  Logout as LogoutIcon,
  Event as EventIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { generatePDF } from './utils/pdfGenerator';
import ChatbotSelector from './components/ChatbotSelector';
import StickyPathPlanBanner from './components/StickyPathPlanBanner';
import AuthModal from './components/AuthModal';
import ChatHistory from './components/ChatHistory';
import Calendar from './components/Calendar';
import { AuthProvider, useAuth } from './contexts/AuthContext';

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

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState('');
  const [messageHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [threadId, setThreadId] = useState(null);
  const [latestPathPlan, setLatestPathPlan] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [savingChat, setSavingChat] = useState(false);
  const [currentView, setCurrentView] = useState('chat'); // 'chat' or 'calendar'
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [selectedChatbot, setSelectedChatbot] = useState('path-planner');

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

  // Handle URL parameters from OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');
    
    if (connected === 'true') {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Switch to calendar view
      setCurrentView('calendar');
    } else if (error === 'connection_failed') {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Switch to calendar view to show error
      setCurrentView('calendar');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loadingChat) return;

    // Clear latest PathPlan when user sends a new message
    setLatestPathPlan(null);

    setLoadingChat(true);
    setError(null);
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/decide`, {
        prompt: userMessage,
        threadId: threadId,
        assistantId: selectedChatbot
      });
      
      console.log('Received response:', response.data);
      
      if (!response.data || !response.data.response) {
        throw new Error('Invalid response format from server');
      }
      
      const newMessage = { 
        type: 'assistant', 
        content: response.data.response,
        isComplete: response.data.isComplete 
      };

      setMessages(prev => [...prev, newMessage]);
      
      // If this is a PathPlan message, update the latest PathPlan
      if (response.data.isComplete) {
        setLatestPathPlan({
          content: response.data.response,
          timestamp: Date.now()
        });
      }

      setThreadId(response.data.threadId);
    } catch (err) {
      console.error('Detailed error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        code: err.code,
        timeout: err.code === 'ECONNABORTED'
      });
      
      let errorMessage = 'Failed to get response. Please try again.';
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response?.status === 500) {
        errorMessage = err.response.data?.error || err.response.data?.details || errorMessage;
      } else if (err.response?.status === 404) {
        errorMessage = 'Server not found. Please check your connection.';
      }
      
      setError(errorMessage);
      // Reset thread ID if we get a thread not found error
      if (err.response?.data?.error?.message?.includes('No thread found')) {
        setThreadId(null);
      }
    } finally {
      setLoadingChat(false);
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

  const handleSaveChat = async () => {
    if (!user || messages.length === 0) return;

    setSavingChat(true);
    try {
      const title = messages[0]?.content?.slice(0, 50) + '...' || 'New Chat';
      await axios.post(`${process.env.REACT_APP_API_URL}/api/chats`, {
        title,
        messages,
        assistantId: selectedChatbot,
        threadId
      });
    } catch (error) {
      console.error('Failed to save chat:', error);
      setError('Failed to save chat');
    } finally {
      setSavingChat(false);
    }
  };

  const handleLoadChat = (chat) => {
    setMessages(chat.messages);
    setSelectedChatbot(chat.assistant_id);
    setThreadId(chat.thread_id);
    setLatestPathPlan(null);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    setMessages([]);
    setThreadId(null);
    setLatestPathPlan(null);
    handleUserMenuClose();
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* App Bar */}
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              onClick={() => {
                setCurrentView('chat');
                setMessages([]);
                setThreadId(null);
                setLatestPathPlan(null);
              }}
            >
              PathPilot
            </Typography>
            
            {user ? (
              <>
                <IconButton
                  color="inherit"
                  onClick={() => setCurrentView(currentView === 'chat' ? 'calendar' : 'chat')}
                  title={currentView === 'chat' ? 'Calendar' : 'Chat'}
                >
                  {currentView === 'chat' ? <EventIcon /> : <HistoryIcon />}
                </IconButton>
                
                {currentView === 'chat' && (
                  <>
                    <IconButton
                      color="inherit"
                      onClick={() => setChatHistoryOpen(true)}
                      title="Chat History"
                    >
                      <HistoryIcon />
                    </IconButton>
                    
                    <IconButton
                      color="inherit"
                      onClick={handleSaveChat}
                      disabled={savingChat || messages.length === 0}
                      title="Save Chat"
                    >
                      {savingChat ? <CircularProgress size={20} /> : <SaveIcon />}
                    </IconButton>
                  </>
                )}
                
                <IconButton
                  color="inherit"
                  onClick={handleUserMenuOpen}
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                    {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                  </Avatar>
                </IconButton>
                
                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={handleUserMenuClose}
                >
                  <MenuItem disabled>
                    <Typography variant="body2">
                      {user.name || user.email}
                    </Typography>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button 
                color="inherit" 
                onClick={() => setAuthModalOpen(true)}
                startIcon={<AccountIcon />}
              >
                Sign In
              </Button>
            )}
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {currentView === 'chat' && (
            <ChatbotSelector 
              selectedChatbot={selectedChatbot}
              onSelectChatbot={setSelectedChatbot}
            />
          )}
          <Container maxWidth="md" sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            px: { xs: 2, sm: 4 },
            py: 2
          }}>
            {currentView === 'chat' ? (
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                gap: 2
              }}>
              <Typography 
                variant="h3" 
                component="h1" 
                align="center" 
                sx={{ 
                  color: 'primary.main',
                  fontFamily: 'Garamond, serif',
                  mb: 1,
                  opacity: messages.length === 0 ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out',
                  pointerEvents: messages.length === 0 ? 'auto' : 'none'
                }}
              >
                Find your way...
              </Typography>
              
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 2, 
                  flex: 1,
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
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
                          {message.type === 'assistant' && message.isComplete && (
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
                  {loadingChat && (
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
                <Paper elevation={3} sx={{ p: 1, mb: 1, bgcolor: 'error.dark' }}>
                  <Typography color="error">{error}</Typography>
                </Paper>
              )}

              <StickyPathPlanBanner 
                latestPathPlan={latestPathPlan}
                onExport={() => setLatestPathPlan(null)}
              />

              <Paper elevation={3} sx={{ p: 1, bgcolor: 'background.paper' }}>
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
                    sx={{ mb: 1 }}
                    inputRef={inputRef}
                  />
                  <ButtonGroup fullWidth variant="contained" sx={{ gap: 1 }}>
                    <Button
                      type="submit"
                      disabled={loadingChat || !input.trim()}
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
            ) : (
              <Calendar />
            )}
          </Container>
        </Box>

        {/* Modals */}
        <AuthModal 
          open={authModalOpen} 
          onClose={() => setAuthModalOpen(false)} 
        />
        
        <ChatHistory 
          open={chatHistoryOpen}
          onClose={() => setChatHistoryOpen(false)}
          onLoadChat={handleLoadChat}
        />
      </Box>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
