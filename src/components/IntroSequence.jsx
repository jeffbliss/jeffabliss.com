import { useState, useEffect } from "react";
import { Typography, Box, Fade } from "@mui/material";
import { useNavigate } from "react-router-dom";

const IntroSequence = () => {
  const [showFirst, setShowFirst] = useState(true);
  const [showSecond, setShowSecond] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timeout1 = setTimeout(() => {
      setShowFirst(false);

      const timeout2 = setTimeout(() => {
        setShowSecond(true);
        const audio = new Audio("/src/assets/sounds/dj-airhorn.mp3");
        audio.play();

        const timeout3 = setTimeout(() => {
          setShowSecond(false);

          const timeout4 = setTimeout(() => {
            navigate("/appalachiantrail");
          }, 1000);
        }, 3000);
      }, 1000);
    }, 10000);

    return () => {
      clearTimeout(timeout1);
    };
  }, [navigate]);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <Fade in={showFirst} timeout={1000}>
        <Typography
          variant="h2"
          component="h1"
          sx={{
            position: "absolute",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Claude Code Presentation for NEMAC
        </Typography>
      </Fade>

      <Fade in={showSecond} timeout={1000}>
        <Typography
          variant="h2"
          component="h1"
          sx={{
            position: "absolute",
            textAlign: "center",
            fontWeight: "bold",
            color: "primary.main",
          }}
        >
          Just kidding this is about the AT!
        </Typography>
      </Fade>
    </Box>
  );
};

export default IntroSequence;
