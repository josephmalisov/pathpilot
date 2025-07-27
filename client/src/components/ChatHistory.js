import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  History as HistoryIcon,
  Delete as DeleteIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';

const ChatHistory = ({ open, onClose, onLoadChat }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, chatId: null });

  useEffect(() => {
    if (open) {
      fetchChatHistory();
    }
  }, [open]);

  const fetchChatHistory = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/chats`);
      setChats(response.data.chats);
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      setError('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadChat = (chat) => {
    onLoadChat(chat);
    onClose();
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/chats/${chatId}`);
      setChats(chats.filter(chat => chat.id !== chatId));
      setDeleteDialog({ open: false, chatId: null });
    } catch (error) {
      console.error('Failed to delete chat:', error);
      setError('Failed to delete chat');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getAssistantName = (assistantId) => {
    const assistantNames = {
      'path-planner': 'Path Planner',
      'atomic-habits': 'Atomic Habits',
      'essentialist': 'Essentialist',
      'flow-zone': 'Flow Zone'
    };
    return assistantNames[assistantId] || assistantId;
  };

  return (
    <>
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: 320,
            bgcolor: 'background.paper'
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon />
            Chat History
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider />
        
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          ) : chats.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No chat history yet
              </Typography>
            </Box>
          ) : (
            <List>
              {chats.map((chat) => (
                <ListItem
                  key={chat.id}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialog({ open: true, chatId: chat.id });
                      }}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemButton onClick={() => handleLoadChat(chat)}>
                    <ListItemText
                      primary={chat.title}
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {getAssistantName(chat.assistant_id)}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(chat.created_at)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, chatId: null })}>
        <DialogTitle>Delete Chat</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this chat? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, chatId: null })}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeleteChat(deleteDialog.chatId)} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatHistory; 