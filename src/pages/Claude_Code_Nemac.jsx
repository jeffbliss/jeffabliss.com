import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Paper } from '@mui/material';

const staffData = [
  {
    name: "Karin Rogers",
    image: "/photos/nemac_staff/karin.png",
    title: "Director",
    haiku: "Vision guides the way\nLeadership flows like water\nNature's path revealed"
  },
  {
    name: "Greg Dobson",
    image: "/photos/nemac_staff/greg.jpeg",
    title: "Director of GIS and Engagement",
    haiku: "Maps tell ancient tales\nData dances with the earth\nStories come alive"
  },
  {
    name: "Dave Michelson",
    image: "/photos/nemac_staff/lol_dave.png",
    title: "Chief Anarchy Officer",
    haiku: "Chaos breeds order\nRules bend like mountain rivers\nFreedom finds its voice"
  },
  {
    name: "Jessica Orlando",
    image: "/photos/nemac_staff/jessica.jpeg",
    title: "Geospatial Research Scientist",
    haiku: "Science meets the wild\nPixels hold the planet's truth\nResearch lights the path"
  },
  {
    name: "Ian Johnson",
    image: "/photos/nemac_staff/ian.jpeg",
    title: "Senior Geospatial Analyst",
    haiku: "Numbers tell stories\nLayers deep beneath the soil\nAnalysis blooms bright"
  },
  {
    name: "Ashlyn Dunsworth",
    image: "/photos/nemac_staff/ashlyn.jpeg",
    title: "Science Editor",
    haiku: "Words shape understanding\nClarity cuts through the fog\nTruth in every line"
  },
  {
    name: "Jeff Bliss",
    image: "/photos/nemac_staff/jeff.jpeg",
    title: "Senior Software Developer",
    haiku: "Code flows like water\nAlgorithms dance with trees\nLogic meets the wild"
  },
  {
    name: "Grace Chien",
    image: "/photos/nemac_staff/grace.jpeg",
    title: "UX Designer",
    haiku: "Beauty serves purpose\nUsers find their natural path\nDesign speaks in whispers"
  },
  {
    name: "Cynthia Fountain",
    image: "/photos/nemac_staff/cynthia.png",
    title: "Administrative Associate",
    haiku: "Order from chaos\nPapers flow like autumn leaves\nStructure supports dreams"
  },
  {
    name: "Dani Levy",
    image: "/photos/nemac_staff/dani.jpeg",
    title: "Software Developer",
    haiku: "Functions find their form\nBugs scatter like startled deer\nCode grows strong and true"
  },
  {
    name: "Gina Martinez",
    image: "/photos/nemac_staff/gina.png",
    title: "UX Designer",
    haiku: "Interfaces bloom bright\nUser journeys wind like trails\nDesign meets the heart"
  },
  {
    name: "Marley Michelson",
    image: "/photos/nemac_staff/lol_dave.png",
    title: "Lead Marley Monday's facilitator",
    haiku: "Four paws guide the team\nTail wags bring joy to meetings\nWisdom has no words"
  },
  {
    name: "Georgie Rogers",
    image: "/photos/nemac_staff/lol_dave.png",
    title: "Lead White Tornado",
    haiku: "Space helmet gleaming\nChaos wrapped in fuzzy love\nStars shine in bright eyes"
  }
];

const Claude_Code_Nemac = () => {
  const [isAnarchyMode, setIsAnarchyMode] = useState(false);
  const [weather, setWeather] = useState("Sunny and 75°F - Perfect mountain weather!");
  const [flashingText, setFlashingText] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnarchyMode(true);
    }, 5000);

    const flashTimer = setInterval(() => {
      setFlashingText(prev => !prev);
    }, 500);

    return () => {
      clearTimeout(timer);
      clearInterval(flashTimer);
    };
  }, []);

  const squigglyLineStyle = {
    fontFamily: "'Courier New', monospace",
    fontSize: '3rem',
    color: '#FFD700',
    textAlign: 'center',
    margin: '20px 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'rainbow 3s ease-in-out infinite'
  };

  const containerStyle = {
    minHeight: '100vh',
    background: `
      linear-gradient(45deg, rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.1)),
      url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10,90 Q30,10 50,50 T90,30" stroke="%23228B22" stroke-width="0.5" fill="none" opacity="0.3"/><path d="M20,80 Q40,20 60,40 T80,60" stroke="%23228B22" stroke-width="0.5" fill="none" opacity="0.3"/></svg>') repeat,
      radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent),
      radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3), transparent),
      radial-gradient(circle at 40% 80%, rgba(120, 255, 198, 0.3), transparent)
    `,
    padding: '20px',
    fontFamily: 'Comic Sans MS, cursive'
  };

  const staffBoxStyle = {
    background: 'linear-gradient(145deg, #90EE90, #98FB98)',
    border: '3px solid #228B22',
    borderRadius: '50px',
    padding: '20px',
    textAlign: 'center',
    height: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 16px rgba(0,0,0,0.3), inset 0 0 20px rgba(255,255,255,0.2)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'scale(1.05) rotate(2deg)',
      boxShadow: '0 12px 24px rgba(0,0,0,0.4)'
    }
  };

  const imageStyle = {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid #FFD700',
    transition: 'transform 0.5s ease',
    cursor: 'pointer',
    '&:hover': {
      transform: 'rotate(360deg) scale(1.1)'
    }
  };

  return (
    <Box sx={containerStyle}>
      <audio autoPlay loop>
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFAlGn+D2u2ccBTOI0/bYgC0FJ3nJ8OOVRwsWYbfm7LBdGAg+ltryxnkpBSl+zPLaizsIGGS67OihUgwLTKXh8bllHgg2jdXzzn0vBSV6yO/eizEIHWq+6OSmWRYKQ5zd8sFuIAUuhM/z3YU2Bhxqvu7glEoODU2n4PK8aB4GM4nU8tJ9LgUme8rx4I4+CRZiturqpVoVCEOa3PLEcSEELIHM8duTNgsZbLvs5qNTEwxOpN/zuWUdBzWH0vTOfjAGJXzH7N2QQAkUYLfm7q1aFQlBmN3yxHEgBC2Cy/HadDEJGWu97OekURAMTqPf87hnHgU1idL0z3w0BjRrg0+e/+lnuUEdvPmOl0vOqOHJZvD/qnC6fGGp4ZP9PLZ6tEPkAXcF7FXf1hNnTNQlb1Ff/k" type="audio/wav" />
      </audio>

      <Box sx={{ textAlign: 'center', marginBottom: '40px' }}>
        <Typography variant="h1" sx={squigglyLineStyle}>
          {isAnarchyMode ? "OWNED BY CHIEF ANARCHY OFFICER" : "~*~*~ About NEMAC ~*~*~"}
        </Typography>
        
        <Typography variant="h4" sx={{ 
          color: flashingText ? '#FF0000' : '#00FF00',
          fontFamily: 'Impact, fantasy',
          textShadow: '0 0 10px currentColor',
          margin: '20px 0'
        }}>
          {isAnarchyMode ? "DAVE RULES EVERYTHING!!!" : "Welcome to the MOST RADICAL Environmental Site EVER!"}
        </Typography>

        <Paper sx={{ 
          background: 'rgba(0,0,0,0.8)', 
          color: '#00FF00', 
          padding: '15px', 
          margin: '20px auto',
          maxWidth: '600px',
          border: '2px solid #00FF00',
          fontFamily: 'Courier New, monospace'
        }}>
          <Typography variant="body1" sx={{ marginBottom: '10px' }}>
            🌱 "Like a mountain that endures the storm, our resilience grows stronger with each challenge, 
            nurturing both our spirits and the earth we protect." 🌍
          </Typography>
          
          <Typography variant="body2" sx={{ color: '#FFD700' }}>
            🤖 DISCLAIMER: This page was generated by Claude Code AI with full consent of all photographed colleagues. 
            Estimated carbon footprint: ~0.02 kg CO2 (equivalent to 3 seconds of breathing) 💨
          </Typography>
          
          <Typography variant="body2" sx={{ color: '#FF6B6B', marginTop: '10px' }}>
            🎵 Background Music: "Enter Sandman" by Metallica (in your imagination) 🎸
          </Typography>
          
          <Typography variant="body2" sx={{ color: '#4ECDC4', marginTop: '10px' }}>
            🌤️ Today's Weather in Asheville: {weather} 
          </Typography>
          
          <Typography variant="body2" sx={{ color: '#96CEB4', marginTop: '10px' }}>
            🍽️ Best Restaurant in Asheville: Curate (Spanish tapas that will blow your mind!) 🥘
          </Typography>
        </Paper>

        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d52085.38088104381!2d-82.59402484999999!3d35.5950581!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8859f350476bb49d%3A0x9b8017cda47d8b6e!2sAsheville%2C%20NC!5e0!3m2!1sen!2sus!4v1234567890123"
          width="400" 
          height="200" 
          style={{ 
            border: '3px solid #FF0000', 
            margin: '20px auto',
            display: 'block',
            borderRadius: '15px',
            boxShadow: '0 0 20px rgba(255,0,0,0.5)'
          }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </Box>

      <Grid container spacing={3}>
        {staffData.map((staff, index) => (
          <Grid key={index} size={{ xs: 12, md: 3 }}>
            <Paper sx={staffBoxStyle}>
              <img
                src={isAnarchyMode ? "/photos/nemac_staff/lol_dave.png" : staff.image}
                alt={isAnarchyMode ? "Dave Michelson - Supreme Ruler" : staff.name}
                style={imageStyle}
                onError={(e) => {
                  e.target.src = "/photos/nemac_staff/lol_dave.png";
                }}
              />
              
              <Typography variant="h6" sx={{ 
                fontWeight: 'bold', 
                color: '#000000',
                marginTop: '15px',
                textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
              }}>
                {isAnarchyMode ? "DAVE MICHELSON" : staff.name}
              </Typography>
              
              <Typography variant="body1" sx={{ 
                fontWeight: 'bold', 
                color: '#6c757d',
                marginBottom: '10px'
              }}>
                {isAnarchyMode ? "SUPREME OVERLORD OF EVERYTHING" : staff.title}
              </Typography>
              
              <Typography variant="body2" sx={{ 
                fontStyle: 'italic',
                color: '#2E8B57',
                fontSize: '0.9rem',
                lineHeight: 1.2
              }}>
                {isAnarchyMode ? 
                  "Chaos reigns supreme\nAnarchy flows through all things\nDave conquers the world" 
                  : staff.haiku}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <style jsx>{`
        @keyframes rainbow {
          0% { filter: hue-rotate(0deg); }
          50% { filter: hue-rotate(180deg); }
          100% { filter: hue-rotate(360deg); }
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        img:hover {
          animation: spin 0.5s ease-in-out;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default Claude_Code_Nemac;