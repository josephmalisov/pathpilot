import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert
} from '@mui/material';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useAuth } from '../contexts/AuthContext';

const AuthModal = ({ open, onClose }) => {
  const { supabase, user } = useAuth();
  const [error, setError] = useState('');

  // Close modal when user is authenticated
  useEffect(() => {
    if (user && open) {
      console.log('User authenticated, closing modal');
      onClose();
    }
  }, [user, open, onClose]);

  const handleAuthStateChange = (event, session) => {
    console.log('Auth state change:', event, session);
    if (event === 'SIGNED_IN' || event === 'SIGNED_UP') {
      console.log('Closing auth modal after successful auth');
      onClose();
      setError('');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#424242',
          color: '#ffffff',
        }
      }}
    >
      <DialogTitle sx={{ color: '#ffffff' }}>
        <Typography variant="h5" component="div" sx={{ color: '#ffffff' }}>
          Sign In / Sign Up
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#90caf9',
                    brandAccent: '#f48fb1',
                    brandButtonText: '#ffffff',
                    defaultButtonBackground: '#90caf9',
                    defaultButtonBackgroundHover: '#64b5f6',
                    defaultButtonText: '#ffffff',
                    dividerBackground: '#424242',
                    inputBackground: '#424242',
                    inputBorder: '#616161',
                    inputLabelText: '#ffffff',
                    inputPlaceholder: '#bdbdbd',
                    inputText: '#ffffff',
                    anchorTextColor: '#90caf9',
                    anchorTextHoverColor: '#64b5f6',
                  },
                  borderWidths: {
                    inputBorderWidth: '1px',
                    buttonBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '4px',
                    buttonBorderRadius: '4px',
                    inputBorderRadius: '4px',
                  },
                },
              },
            }}
            providers={[]}
            redirectTo={window.location.origin}
            onAuthStateChange={handleAuthStateChange}
            view="sign_in"
            showLinks={true}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: '#424242' }}>
        <Button 
          onClick={onClose} 
          sx={{ 
            color: '#90caf9',
            '&:hover': {
              backgroundColor: 'rgba(144, 202, 249, 0.1)',
            }
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuthModal; 