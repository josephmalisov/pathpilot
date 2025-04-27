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
    name: 'Path Planner',
    description: 'Inspired by Chip & Dan Heath'
  },
  { 
    id: 'atomic-habits', 
    name: 'Atomic Habits',
    description: 'Inspired by James Clear'
  },
  { 
    id: 'essentialist', 
    name: 'Essentialist',
    description: 'Inspired by Greg McKeown'
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
                  primary={chatbot.name}
                  secondary={chatbot.description}
                  secondaryTypographyProps={{
                    sx: {
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.75rem'
                    }
                  }}
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