import { Box, Typography, Button } from "@mui/material";
import { useState, useRef } from "react";
import { climateWords } from "../data/climateWords";

function ClimateTyperMobile() {
  const [gameState, setGameState] = useState("welcome");
  const [score, setScore] = useState(0);
  const [fallingWords, setFallingWords] = useState([]);
  const [flashEffect, setFlashEffect] = useState(null);
  const gameIntervalRef = useRef(null);
  const processedWordsRef = useRef(new Set());

  const handleGameStart = () => {
    setGameState("instructions");
    setTimeout(() => {
      setGameState("playing");
      startWordGeneration();
    }, 5000);
  };

  const startWordGeneration = () => {
    const generateWord = () => {
      const allWords = [...climateWords.good, ...climateWords.bad];
      const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
      const newWord = {
        id: Date.now() + Math.random(),
        text: randomWord,
        isGood: climateWords.good.includes(randomWord),
        x: Math.random() * 50 + 5,
        y: 0,
      };

      setFallingWords((prev) => [...prev, newWord]);

      setTimeout(() => {
        if (!processedWordsRef.current.has(newWord.id)) {
          processedWordsRef.current.add(newWord.id);

          setFallingWords((prev) => {
            const wordStillExists = prev.find((w) => w.id === newWord.id);
            if (wordStillExists) {
              if (newWord.isGood) {
                setScore((s) => s - 1);
                showFlash("red");
                playSound("hit");
              } else {
                setScore((s) => s + 1);
                showFlash("green");
                playSound("success");
              }
              return prev.filter((w) => w.id !== newWord.id);
            }
            return prev;
          });
        }
      }, 3500);
    };

    generateWord();
    gameIntervalRef.current = setInterval(generateWord, 1000);
  };

  const handleWordTouch = (touchedWord) => {
    if (!processedWordsRef.current.has(touchedWord.id)) {
      processedWordsRef.current.add(touchedWord.id);

      setFallingWords((prev) => prev.filter((w) => w.id !== touchedWord.id));

      if (touchedWord.isGood) {
        setScore((s) => s + 1);
        showFlash("green");
        playSound("success");
      } else {
        setScore((s) => s - 1);
        showFlash("red");
        playSound("hit");
      }
    }
  };

  const showFlash = (color) => {
    setFlashEffect(color);
    setTimeout(() => setFlashEffect(null), 200);
  };

  const playSound = (type) => {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    if (type === "success") {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(
        659.25,
        audioContext.currentTime + 0.1,
      );
      oscillator.frequency.setValueAtTime(
        783.99,
        audioContext.currentTime + 0.2,
      );

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else if (type === "hit") {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(100, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.2,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  };

  if (gameState === "welcome") {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "98vh",
          textAlign: "center",
          padding: 2,
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to Climate Clicker!
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={handleGameStart}
          sx={{ mt: 2 }}
        >
          Click to Begin
        </Button>
      </Box>
    );
  }

  if (gameState === "instructions") {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          textAlign: "center",
          padding: 3,
        }}
      >
        <Typography variant="h5" component="p" gutterBottom>
          Touch the GOOD climate words to earn points!
        </Typography>
        <Typography variant="h6" component="p" sx={{ mt: 2 }}>
          Let BAD climate words fall to the ground!
        </Typography>
      </Box>
    );
  }

  if (gameState === "playing") {
    return (
      <Box
        sx={{
          position: "relative",
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
          backgroundColor:
            flashEffect === "green"
              ? "rgba(0, 255, 0, 0.3)"
              : flashEffect === "red"
                ? "rgba(255, 0, 0, 0.3)"
                : "transparent",
          transition: "background-color 0.2s",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 1000,
          }}
        >
          <Typography variant="h5">Score: {score}</Typography>
        </Box>

        {fallingWords.map((word) => (
          <Box
            key={word.id}
            onClick={() => handleWordTouch(word)}
            onTouchStart={() => handleWordTouch(word)}
            sx={{
              position: "absolute",
              left: `${word.x}%`,
              top: `${word.y}%`,
              fontSize: "1.2rem",
              fontWeight: "bold",
              color: "black",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "2px solid black",
              cursor: "pointer",
              userSelect: "none",
              touchAction: "manipulation",
              minWidth: "60px",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "fall 3.5s linear forwards",
              zIndex: 100,
              "@keyframes fall": {
                from: { transform: "translateY(0)" },
                to: { transform: "translateY(100vh)" },
              },
            }}
          >
            {word.text}
          </Box>
        ))}
      </Box>
    );
  }

  return null;
}

export default ClimateTyperMobile;
