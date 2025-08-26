import { useState, useRef } from "react";
import { Typography, Box, Button } from "@mui/material";
import { getQuizById } from "../data/QuizInfo";

const QuizModal = ({ quizIndex, onQuizComplete }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const currentAudioRef = useRef(null);

  const currentQuestion = getQuizById(quizIndex);

  const fadeOutAudio = (audio, duration = 1000) => {
    if (!audio) return Promise.resolve();

    return new Promise((resolve) => {
      const startVolume = audio.volume;
      const fadeStep = startVolume / (duration / 10);

      const fadeInterval = setInterval(() => {
        if (audio.volume > fadeStep) {
          audio.volume -= fadeStep;
        } else {
          audio.volume = 0;
          audio.pause();
          clearInterval(fadeInterval);
          resolve();
        }
      }, 10);
    });
  };

  const handleAnswerClick = async (option) => {
    if (answerSubmitted) return;

    setSelectedAnswer(option.id);
    setAnswerSubmitted(true);
    setIsCorrect(option.isCorrect);

    if (option.isCorrect) {
      const audio = new Audio("./thepriceisrightextendedtheme128kmusic.mp3");
      currentAudioRef.current = audio;
      audio.play();
    } else {
      const audio = new Audio("./the-price-is-right-losing-horn.mp3");
      currentAudioRef.current = audio;
      audio.play();
    }

    setTimeout(async () => {
      await fadeOutAudio(currentAudioRef.current);
      onQuizComplete();
    }, 7000);
  };

  const getButtonStyle = (optionId, isCorrect) => {
    if (!answerSubmitted) {
      return {
        border: "2px solid black",
        color: "black",
        backgroundColor: "white",
        padding: "12px 24px",
        margin: "8px",
        minWidth: "120px",
        fontSize: "18px",
        fontWeight: "normal",
      };
    }

    if (selectedAnswer === optionId) {
      return {
        border: "2px solid black",
        backgroundColor: isCorrect ? "#4CAF50" : "#F44336",
        color: "white",
        padding: "12px 24px",
        margin: "8px",
        minWidth: "120px",
        fontSize: "18px",
        fontWeight: "bold",
      };
    }

    return {
      border: "2px solid black",
      color: "black",
      backgroundColor: "white",
      padding: "12px 24px",
      margin: "8px",
      minWidth: "120px",
      fontSize: "18px",
      fontWeight: "normal",
      opacity: 0.6,
    };
  };

  if (!currentQuestion) {
    return (
      <Typography variant="h6" sx={{ textAlign: "center" }}>
        Quiz question not found
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
        {currentQuestion.question}
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 1,
        }}
      >
        {currentQuestion.options.map((option) => (
          <Button
            key={option.id}
            variant="outlined"
            onClick={() => handleAnswerClick(option)}
            sx={getButtonStyle(option.id, option.isCorrect)}
            disabled={answerSubmitted}
          >
            {option.text}
          </Button>
        ))}
      </Box>

      {answerSubmitted && (
        <Box sx={{ mt: 3 }}>
          <Typography
            variant="h6"
            sx={{
              color: isCorrect ? "#228B22" : "#F44336",
              fontWeight: "bold",
            }}
          >
            {isCorrect ? "Correct!" : "Try again next time!"}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default QuizModal;
