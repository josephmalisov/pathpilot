import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const AuthModal = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
    setFormData({ email: '', password: '', name: '' });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (activeTab === 0) {
        // Login
        result = await login(formData.email, formData.password);
      } else {
        // Register
        result = await register(formData.email, formData.password, formData.name);
      }

      if (result.success) {
        onClose();
        setFormData({ email: '', password: '', name: '' });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (activeTab === 0) {
      return formData.email && formData.password;
    } else {
      return formData.email && formData.password && formData.name;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab label="Login" />
          <Tab label="Register" />
        </Tabs>
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {activeTab === 1 && (
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              margin="normal"
              required
            />
          )}
          
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            margin="normal"
            required
          />
          
          <DialogActions sx={{ mt: 3, px: 0 }}>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!isFormValid() || loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {activeTab === 0 ? 'Login' : 'Register'}
            </Button>
          </DialogActions>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal; 