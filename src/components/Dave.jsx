import React, { useState, useRef } from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import Navbar from './Navbar';

const Dave = () => {
  const [speechText, setSpeechText] = useState('');
  const [isFlashing, setIsFlashing] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDaveismMode, setIsDaveismMode] = useState(true);
  const audioRef = useRef(null);

  const handlePlayClick = () => {
    setSpeechText("Hello, I'm David!");
    setIsPlaying(true);
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Hello, I'm David!");
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => {
        setIsPlaying(false);
        setSpeechText('');
      };
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <Box>
      <Navbar />
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        position: 'relative',
        overflow: 'hidden',
        padding: 2
      }}>
        {/* Scrolling flashing DAVID text */}
        <Box sx={{ 
          position: 'absolute',
          top: '10%',
          width: '100%',
          whiteSpace: 'nowrap',
          animation: 'scroll 8s linear infinite, flash 0.5s ease-in-out infinite alternate'
        }}>
          <Typography 
            variant="h1" 
            sx={{ 
              fontSize: '8rem',
              fontWeight: 'bold',
              letterSpacing: '2rem',
              userSelect: 'none'
            }}
          >
            DAVID
          </Typography>
        </Box>

        {/* Dave character - moved higher */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          <Box sx={{ marginBottom: 2, position: 'relative' }}>
            <img 
              src={isDaveismMode ? "/images/daveism.png" : "/images/dave-avatar.svg"} 
              alt="Dave" 
              style={{ width: '150px', height: '150px' }}
            />
            
            {/* Speech bubble positioned up and to the right */}
            {speechText && isPlaying && (
              <Box sx={{ 
                position: 'absolute',
                top: '-80px',
                right: '-120px',
                backgroundColor: 'white',
                border: '3px solid #1976d2',
                borderRadius: '20px',
                padding: 2,
                maxWidth: '200px',
                minWidth: '150px',
                zIndex: 10,
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: '-15px',
                  left: '30px',
                  width: 0,
                  height: 0,
                  borderLeft: '15px solid transparent',
                  borderRight: '15px solid transparent',
                  borderTop: '15px solid #1976d2'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  bottom: '-12px',
                  left: '33px',
                  width: 0,
                  height: 0,
                  borderLeft: '12px solid transparent',
                  borderRight: '12px solid transparent',
                  borderTop: '12px solid white'
                }
              }}>
                <Typography variant="body1" sx={{ textAlign: 'center', fontSize: '0.9rem' }}>
                  {speechText}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Toggle switch and Play button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
            {/* Toggle switch */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <IconButton
                onClick={() => setIsDaveismMode(!isDaveismMode)}
                sx={{
                  backgroundColor: isDaveismMode ? '#4caf50' : '#f44336',
                  color: 'white',
                  width: 60,
                  height: 60,
                  '&:hover': {
                    backgroundColor: isDaveismMode ? '#45a049' : '#da190b'
                  }
                }}
              >
                {isDaveismMode ? <ToggleOffIcon sx={{ fontSize: '2rem' }} /> : <ToggleOnIcon sx={{ fontSize: '2rem' }} />}
              </IconButton>
              <Typography variant="caption" sx={{ marginTop: 1, textAlign: 'center', fontWeight: 'bold' }}>
                {isDaveismMode ? "Daveism" : "omg lol"}
              </Typography>
            </Box>
            
            {/* Play button */}
            <IconButton 
              onClick={handlePlayClick}
              sx={{ 
                backgroundColor: '#1976d2',
                color: 'white',
                width: 80,
                height: 80,
                '&:hover': {
                  backgroundColor: '#1565c0'
                }
              }}
            >
              <PlayArrowIcon sx={{ fontSize: '3rem' }} />
            </IconButton>
          </Box>

        </Box>

        {/* Bottom rectangle - shifted up by 20% */}
        <Paper sx={{ 
          position: 'absolute',
          bottom: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: 4,
          backgroundColor: 'white',
          border: '2px solid black',
          width: '80%',
          maxWidth: '600px'
        }}>
          <Typography 
            variant="h4" 
            sx={{ 
              textAlign: 'center',
              fontWeight: 'bold',
              color: 'black'
            }}
          >
            You did this to yourself David
          </Typography>
        </Paper>

        {/* CSS animations */}
        <style jsx>{`
          @keyframes scroll {
            0% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }

          @keyframes flash {
            0% {
              color: black;
            }
            100% {
              color: white;
            }
          }
        `}</style>
      </Box>
    </Box>
  );
};

export default Dave;