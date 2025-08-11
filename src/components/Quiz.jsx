import { useState, useRef } from 'react';
import { Typography, Box, Container, Button } from '@mui/material';
import Navbar from './Navbar';
import { quizData } from '../data/QuizInfo';

const Quiz = () => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const currentAudioRef = useRef(null);
  
  const currentQuestion = quizData.questions[currentQuestionIndex];

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

  const handleAnswerClick = (option) => {
    if (answerSubmitted) return; // Prevent multiple clicks
    
    setSelectedAnswer(option.id);
    setAnswerSubmitted(true);
    setIsCorrect(option.isCorrect);
    
    if (option.isCorrect) {
      // Play winning sound
      const audio = new Audio('/src/assets/sounds/thepriceisrightextendedtheme128kmusic.mp3');
      currentAudioRef.current = audio;
      audio.play();
    } else {
      // Play losing sound
      const audio = new Audio('/src/assets/sounds/the-price-is-right-losing-horn.mp3');
      currentAudioRef.current = audio;
      audio.play();
    }
  };

  const handleNextQuestion = async () => {
    await fadeOutAudio(currentAudioRef.current);
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      resetQuestion();
    }
  };

  const handleTryAgain = async () => {
    await fadeOutAudio(currentAudioRef.current);
    resetQuestion();
  };

  const resetQuestion = () => {
    setSelectedAnswer(null);
    setAnswerSubmitted(false);
    setIsCorrect(false);
  };

  const getButtonStyle = (optionId, isCorrect) => {
    if (!answerSubmitted) {
      return {
        border: '2px solid black',
        color: 'black',
        backgroundColor: 'white',
        padding: '12px 24px',
        margin: '8px',
        minWidth: '120px',
        fontSize: '18px',
        fontWeight: 'normal'
      };
    }
    
    if (selectedAnswer === optionId) {
      return {
        border: '2px solid black',
        backgroundColor: isCorrect ? '#4CAF50' : '#F44336',
        color: 'white',
        padding: '12px 24px',
        margin: '8px',
        minWidth: '120px',
        fontSize: '18px',
        fontWeight: 'bold'
      };
    }
    
    return {
      border: '2px solid black',
      color: 'black',
      backgroundColor: 'white',
      padding: '12px 24px',
      margin: '8px',
      minWidth: '120px',
      fontSize: '18px',
      fontWeight: 'normal',
      opacity: 0.6
    };
  };

  return (
    <>
      <Navbar />

      {/* Quiz Content */}
      <Container>
        <Box sx={{ 
          mt: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Appalachian Trail Quiz
          </Typography>
          
          <Typography variant="h4" component="h2" sx={{ mt: 4, mb: 4 }}>
            {currentQuestion.question}
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 1
          }}>
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
          
          {/* Navigation Button */}
          {answerSubmitted && (
            <Box sx={{ mt: 4 }}>
              {isCorrect ? (
                <Button
                  variant="contained"
                  onClick={handleNextQuestion}
                  sx={{
                    backgroundColor: '#228B22',
                    color: 'white',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: '#1e7a1e'
                    }
                  }}
                  disabled={currentQuestionIndex >= quizData.questions.length - 1}
                >
                  {currentQuestionIndex >= quizData.questions.length - 1 ? 'Quiz Complete!' : 'Next Question'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleTryAgain}
                  sx={{
                    backgroundColor: '#F44336',
                    color: 'white',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: '#d32f2f'
                    }
                  }}
                >
                  Try Again
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
};

export default Quiz;