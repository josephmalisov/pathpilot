import React, { useEffect, useState } from 'react';
import { 
  Paper, 
  Button, 
  Box,
  Fade,
  Grow,
  Typography
} from '@mui/material';
import { generatePDF } from '../utils/pdfGenerator';

const StickyPathPlanBanner = ({ latestPathPlan, onExport }) => {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (latestPathPlan) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [latestPathPlan]);

  if (!latestPathPlan) return null;

  const handleExport = () => {
    generatePDF(latestPathPlan.content);
    if (onExport) onExport();
  };

  return (
    <Fade in={true}>
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          backgroundColor: 'rgba(30, 30, 30, 0.95)',
          padding: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1,
          position: 'relative',
          overflow: 'visible'
        }}
      >
        <Box sx={{ 
          flexGrow: 1, 
          maxWidth: 'lg',
          position: 'relative'
        }}>
          {showCelebration && (
            <Grow in={showCelebration} timeout={500}>
              <Typography
                variant="h6"
                sx={{
                  position: 'absolute',
                  top: -25,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: 'primary.main',
                  fontWeight: 'bold',
                  fontSize: '1.25rem',
                  animation: 'float 2s ease-in-out',
                  '@keyframes float': {
                    '0%': { transform: 'translate(-50%, 0)', opacity: 1 },
                    '100%': { transform: 'translate(-50%, -20px)', opacity: 0 }
                  }
                }}
              >
                New PathPlan! 🎉
              </Typography>
            </Grow>
          )}
          <Button
            variant="contained"
            color="primary"
            size="medium"
            fullWidth
            onClick={handleExport}
            sx={{
              py: 0.75,
              fontSize: '0.9rem',
              fontWeight: 'bold',
              position: 'relative',
              zIndex: 1
            }}
          >
            Download Latest PathPlan
          </Button>
        </Box>
      </Paper>
    </Fade>
  );
};

export default StickyPathPlanBanner; 