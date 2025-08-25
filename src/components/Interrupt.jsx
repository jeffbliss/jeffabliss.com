import { useState, useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import QuizModal from "./QuizModal.jsx";

const Interrupt = ({ interrupt, quizIndex, onInterruptComplete }) => {
  const [showQuiz, setShowQuiz] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);
  const airhornRef = useRef(null);

  useEffect(() => {
    if (interrupt && !animationStarted) {
      setAnimationStarted(true);

      const airhorn = new Audio("./dj-airhorn.mp3");
      airhornRef.current = airhorn;
      airhorn.play();

      setTimeout(() => {
        setShowQuiz(true);
      }, 5000);
    }
  }, [interrupt, animationStarted]);

  const handleQuizComplete = () => {
    setShowQuiz(false);
    setAnimationStarted(false);
    if (onInterruptComplete) {
      onInterruptComplete();
    }
  };

  if (!interrupt) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "black",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {!showQuiz && (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: "2rem", md: "4rem" },
              fontWeight: "bold",
              textAlign: "center",
              background:
                "linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)",
              backgroundSize: "400% 400%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation:
                "rainbow 5s linear infinite, flash 0.5s ease-in-out infinite alternate, scroll 5s linear infinite",
              "@keyframes rainbow": {
                "0%": { backgroundPosition: "0% 50%" },
                "50%": { backgroundPosition: "100% 50%" },
                "100%": { backgroundPosition: "0% 50%" },
              },
              "@keyframes flash": {
                "0%": { opacity: 1 },
                "100%": { opacity: 0.5 },
              },
              "@keyframes scroll": {
                "0%": { transform: "translateX(100vw)" },
                "100%": { transform: "translateX(-100%)" },
              },
            }}
          >
            WE INTERRUPT THIS PRESENTATION TO BRING YOU THIS IMPORTANT QUIZ
          </Typography>
        </Box>
      )}

      {showQuiz && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: "800px",
            maxHeight: "90vh",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            overflow: "auto",
          }}
        >
          <QuizModal
            quizIndex={quizIndex}
            onQuizComplete={handleQuizComplete}
          />
        </Box>
      )}
    </Box>
  );
};

export default Interrupt;
