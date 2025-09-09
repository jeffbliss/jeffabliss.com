import { Box, Typography, Button } from "@mui/material";
import { useState, useRef } from "react";
import { climateWords } from "../data/climateWords";
import ClimateTyperMobile from "../components/ClimateTyperMobile";

function ClimateTyper() {
  const [gameState, setGameState] = useState("welcome");
  const [score, setScore] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [fallingWords, setFallingWords] = useState([]);
  const [flashEffect, setFlashEffect] = useState(null);
  const gameContainerRef = useRef(null);

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  };

  if (isMobile()) {
    return <ClimateTyperMobile />;
  }

  const handleGameStart = () => {
    setGameState("instructions");
    setTimeout(() => {
      setGameState("playing");
      startWordGeneration();
      setTimeout(() => {
        if (gameContainerRef.current) {
          gameContainerRef.current.focus();
        }
      }, 100);
    }, 6000);
  };

  const startWordGeneration = () => {
    const generateWord = () => {
      const allWords = [...climateWords.good, ...climateWords.bad];
      const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
      const newWord = {
        id: Date.now() + Math.random(),
        text: randomWord,
        isGood: climateWords.good.includes(randomWord),
        x: Math.random() * 80 + 10,
        y: 0,
      };

      setFallingWords((prev) => [...prev, newWord]);

      setTimeout(() => {
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
      }, 5000);
    };

    generateWord();
    const interval = setInterval(generateWord, 1000);

    return () => clearInterval(interval);
  };

  const handleKeyPress = (event) => {
    if (gameState === "playing") {
      if (event.key === "Enter") {
        const typedWord = currentInput.toUpperCase();
        const matchingWord = fallingWords.find((w) => w.text === typedWord);

        if (matchingWord) {
          setFallingWords((prev) =>
            prev.filter((w) => w.id !== matchingWord.id),
          );

          if (matchingWord.isGood) {
            setScore((s) => s + 1);
            showFlash("green");
            playSound("success");
          } else {
            setScore((s) => s - 1);
            showFlash("red");
            playSound("hit");
          }
        }
        setCurrentInput("");
      } else if (event.key.length === 1) {
        setCurrentInput((prev) => prev + event.key.toUpperCase());
      } else if (event.key === "Backspace") {
        setCurrentInput((prev) => prev.slice(0, -1));
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
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to Climate Typer!
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
        }}
      >
        <Typography variant="h4" component="p">
          The goal of the game is to type the carbon friendly words and let the
          bad words fall to the ground
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={gameContainerRef}
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
        outline: "none",
      }}
      tabIndex={0}
      onKeyDown={handleKeyPress}
    >
      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 1000,
        }}
      >
        <Typography variant="h4">Score: {score}</Typography>
      </Box>

      {fallingWords.map((word) => (
        <Box
          key={word.id}
          sx={{
            position: "absolute",
            left: `${word.x}%`,
            top: `${word.y}%`,
            fontSize: "2rem",
            fontWeight: "bold",
            color: "black",
            animation: "fall 5s linear forwards",
            "@keyframes fall": {
              from: { transform: "translateY(0)" },
              to: { transform: "translateY(100vh)" },
            },
          }}
        >
          {word.text}
        </Box>
      ))}

      <Box
        sx={{
          position: "absolute",
          bottom: 50,
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
        }}
      >
        <Typography variant="h5" gutterBottom>
          Type: {currentInput}
        </Typography>
        <Typography variant="body1">Press Enter to submit word</Typography>
      </Box>
    </Box>
  );
}

export default ClimateTyper;
