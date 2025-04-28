import React from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText,
  Typography,
  Paper
} from '@mui/material';

const chatbots = [
  { 
    id: 'path-planner', 
    name: 'Decision Bot',
    description: 'Inspiration: Decisive by Chip & Dan Heath'
  },
  { 
    id: 'atomic-habits', 
    name: 'Habit Doctor',
    description: 'Inspiration: Atomic Habits by James Clear'
  },
  { 
    id: 'essentialist', 
    name: 'Essentialist',
    description: 'Inspiration: Essentialism by Greg McKeown'
  }
];

const ChatbotSelector = ({ selectedChatbot, onSelectChatbot }) => {
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        height: '100%', 
        width: 250,
        backgroundColor: '#1e1e1e',
        borderRadius: 0
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Frameworks
        </Typography>
        <List>
          {chatbots.map((chatbot) => (
            <ListItem key={chatbot.id} disablePadding>
              <ListItemButton
                selected={selectedChatbot === chatbot.id}
                onClick={() => onSelectChatbot(chatbot.id)}
              >
                <ListItemText 
                  primary={
                    <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>
                      {chatbot.name}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {chatbot.description.split(' by ')[0]} by{' '}
                      <Typography component="span" sx={{ fontWeight: 'bold', fontSize: 'inherit' }}>
                        {chatbot.description.split(' by ')[1]}
                      </Typography>
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Paper>
  );
};

export default ChatbotSelector; 