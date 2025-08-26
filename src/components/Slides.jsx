import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Modal,
  Backdrop,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Paper,
} from "@mui/material";
import {
  Close,
  ArrowBack,
  ArrowForward,
  PictureAsPdf,
  Code,
  ContentCopy,
  Rocket,
} from "@mui/icons-material";
import Dave from "./Dave.jsx";
import Claude_Code_Jeff from "../pages/Claude_Code_Jeff.jsx";
import QuizModal from "./QuizModal.jsx";

const slidesData = [
  {
    type: "powerpoint",
    title: "NEMAC AI Discussion",
    details:
      "Or how Jeff Jeff Jeff used Claude Code to barely write any code himself",
  },
  {
    type: "demonstration",
    title: "Demonstration",
    details: "Click on a feature to view in full screen",
  },
  {
    type: "try",
    title: "Now you try!",
    details: "Ready to create your own page with Claude Code?",
  },
  {
    type: "bullets",
    title: "Lessons Learned",
    bullets: [
      "UI design and UX is hard",
      "It was hard to come up with a good presentation",
      "Dave thought this presentation was about him",
    ],
  },
  {
    type: "image",
    title: "Just kidding I have an actual presentation",
    heroImage: "aw_snap.png",
    details: "Click the image to view the presentation",
  },
  {
    type: "appalachian",
    title: "Appalachian Trail",
    details:
      "A long time ago, in a NEMAC far far away, Greg asked Jeff to give the group a presentation on the Appalachian Trail. Jeff's requirements were clear and finally Greg uploaded the infamous video. \n\nIt is now Jeff's turn. What awaits us only time will tell...",
  },
  {
    type: "quiz",
    title: "Quiz Time!",
    quizIndex: 1,
    details: "Let's test your knowledge",
  },
  {
    type: "quiz",
    title: "Quiz Time!",
    quizIndex: 2,
    details: "Let's test your knowledge",
  },
  {
    type: "bullets",
    title: "AT Fun Facts",
    bullets: [
      "2185 miles (in 2014)",
      "193 days (April 1st - October 10th)",
      "28-29 years old",
      "Met fantastic friends",
    ],
  },
  {
    type: "bullets",
    title: "AT Fun Facts Continued",
    bullets: [
      "Trail goes through 14 states",
      "Trail goes through numerous towns",
    ],
  },
  {
    type: "bullets",
    title: "Jeff AT Fun Facts",
    bullets: [
      "33 lbs backpack at heaviest",
      "Went 2 weeks without showering",
      "Slept in a graveyard in New Hampshire",
      "Trail Name was Yellow Beard",
      "Maine was my favorite state",
      "Pennsylvania was my least favorite state",
    ],
  },
];

const Slides = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isDaveModalOpen, setIsDaveModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [animationPhase, setAnimationPhase] = useState("loading"); // "loading", "complete"
  const [timeOnSlide, setTimeOnSlide] = useState(0);
  const [appalachianPhase, setAppalachianPhase] = useState("waiting"); // "waiting", "title", "scroll"
  const [appalachianAudio, setAppalachianAudio] = useState(null);

  const nextSlide = () => {
    if (currentSlide === slidesData.length - 1) {
      window.location.href = "/nemacpresentation";
      return;
    }
    setCurrentSlide((prev) => (prev + 1) % slidesData.length);
    resetAnimation();
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + slidesData.length) % slidesData.length,
    );
    resetAnimation();
  };

  const resetAnimation = () => {
    setAnimationPhase("loading");
    setTimeOnSlide(0);
    setAppalachianPhase("waiting");
    if (appalachianAudio) {
      appalachianAudio.pause();
      setAppalachianAudio(null);
    }
  };

  const handleImageClick = () => {
    setIsVideoOpen(true);
  };

  const closeVideo = () => {
    setIsVideoOpen(false);
    if (currentSlide === 4) {
      setTimeout(() => {
        setCurrentSlide(5);
        resetAnimation();
      }, 500);
    }
  };

  const openDaveModal = () => {
    setIsDaveModalOpen(true);
  };

  const closeDaveModal = () => {
    setIsDaveModalOpen(false);
  };

  const openPdfModal = () => {
    setIsPdfModalOpen(true);
  };

  const closePdfModal = () => {
    setIsPdfModalOpen(false);
  };

  const openCodeModal = () => {
    setIsCodeModalOpen(true);
  };

  const closeCodeModal = () => {
    setIsCodeModalOpen(false);
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "ArrowLeft") {
        prevSlide();
      } else if (event.key === "ArrowRight") {
        nextSlide();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Animation timer for image slide
  useEffect(() => {
    if (currentSlide === 4) {
      const timer = setInterval(() => {
        setTimeOnSlide((prev) => {
          const newTime = prev + 0.1;

          if (newTime >= 7 && animationPhase === "loading") {
            setAnimationPhase("complete");
          }

          return newTime;
        });
      }, 100);

      return () => clearInterval(timer);
    } else {
      resetAnimation();
    }
  }, [currentSlide, animationPhase]);

  // Appalachian Trail slide animation
  useEffect(() => {
    if (currentSlide === 5) {
      // Start audio and begin animation sequence
      const audio = new Audio("Star Wars Theme Song By John Williams.mp3");
      setAppalachianAudio(audio);

      // Start with a brief delay, then show title
      setTimeout(() => {
        setAppalachianPhase("title");
        audio.play().catch(console.error);
      }, 1000);

      // After title animation, start scroll
      setTimeout(() => {
        setAppalachianPhase("scroll");
      }, 5000);

      return () => {
        if (audio) {
          audio.pause();
        }
      };
    }
  }, [currentSlide]);

  const renderSlideContent = () => {
    const slide = slidesData[currentSlide];

    switch (slide.type) {
      case "powerpoint":
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              textAlign: "center",
              p: 4,
            }}
          >
            <Typography
              variant="h2"
              component="h1"
              sx={{ mb: 4, fontWeight: "bold", color: "primary.main" }}
            >
              {slide.title}
            </Typography>
            <Typography
              variant="h4"
              sx={{ maxWidth: "1200px", lineHeight: 1.6 }}
            >
              {slide.details}
            </Typography>
          </Box>
        );

      case "demonstration":
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              p: 4,
            }}
          >
            <Typography
              variant="h2"
              component="h1"
              sx={{
                mb: 4,
                fontWeight: "bold",
                color: "primary.main",
                textAlign: "center",
              }}
            >
              {slide.title}
            </Typography>
            <Typography
              variant="h5"
              sx={{ mb: 6, textAlign: "center", color: "text.secondary" }}
            >
              {slide.details}
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                justifyContent: "center",
                maxWidth: "1000px",
              }}
            >
              <Card
                onClick={openPdfModal}
                sx={{
                  width: 300,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    p: 4,
                  }}
                >
                  <PictureAsPdf
                    sx={{ fontSize: 80, color: "error.main", mb: 2 }}
                  />
                  <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
                    PDF Design
                  </Typography>
                  <Typography variant="body1" sx={{ textAlign: "center" }}>
                    Claude Code NEMAC PDF
                  </Typography>
                </CardContent>
              </Card>

              <Card
                onClick={openCodeModal}
                sx={{
                  width: 300,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    p: 4,
                  }}
                >
                  <Code sx={{ fontSize: 80, color: "primary.main", mb: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
                    Code Component
                  </Typography>
                  <Typography variant="body1" sx={{ textAlign: "center" }}>
                    Claude Code Jeff Component
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        );

      case "try":
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "80vh",
              p: 4,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: "50%",
                bgcolor: "rgba(255, 255, 255, 0.1)",
                animation: "float 6s ease-in-out infinite",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -30,
                left: -30,
                width: 150,
                height: 150,
                borderRadius: "50%",
                bgcolor: "rgba(255, 255, 255, 0.05)",
                animation: "float 8s ease-in-out infinite reverse",
              }}
            />

            <Rocket
              sx={{
                fontSize: 120,
                color: "#FFD700",
                mb: 3,
                animation: "bounce 2s infinite",
              }}
            />

            <Typography
              variant="h1"
              component="h1"
              sx={{
                mb: 3,
                fontWeight: "bold",
                color: "white",
                textAlign: "center",
                textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              {slide.title}
            </Typography>

            <Typography
              variant="h4"
              sx={{
                mb: 6,
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.9)",
                maxWidth: "800px",
                lineHeight: 1.6,
              }}
            >
              {slide.details}
            </Typography>

            <Paper
              elevation={8}
              sx={{
                p: 4,
                maxWidth: "900px",
                width: "100%",
                bgcolor: "rgba(255, 255, 255, 0.95)",
                borderRadius: 3,
                mb: 4,
                position: "relative",
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  mb: 3,
                  fontWeight: "bold",
                  color: "#333",
                  textAlign: "center",
                }}
              >
                🎯 Here's exactly how Jeff prompted Claude Code:
              </Typography>

              <Box
                sx={{
                  bgcolor: "#f8f9fa",
                  p: 3,
                  borderRadius: 2,
                  border: "2px solid #e9ecef",
                  fontFamily: "monospace",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  maxHeight: "300px",
                  overflow: "auto",
                  position: "relative",
                }}
              >
                <Typography
                  component="pre"
                  sx={{ whiteSpace: "pre-wrap", color: "#495057" }}
                >
                  {`This looks great!

I'd like you to add another slide after demonstration called "Now you try" 

The goal of this slide is to allow my audience to attempt to use the same prompt and to create a page themselves in Claude Code

I'd like the style to be warm and inviting and convey a message of wanting them to really give it a try. You are the architect and designer here so I trust your judgment

However you implement it I want to either put <prompt> in my paste buffer so I can use it or somehow display the prompt so I can easily copy and paste it

[The actual NEMAC staff prompt would be displayed here]

Additionally I'd like you to display everything in <block> to show my audience how I actually prompted you to make this. You can omit the text in <prompt> or just summarize it as "prompt"

Again you are the designer and the architect here and I fully trust you. Make it fun and exciting!`}
                </Typography>

                <IconButton
                  onClick={() => {
                    navigator.clipboard.writeText(`This looks great!

I'd like you to add another slide after demonstration called "Now you try" 

The goal of this slide is to allow my audience to attempt to use the same prompt and to create a page themselves in Claude Code

I'd like the style to be warm and inviting and convey a message of wanting them to really give it a try. You are the architect and designer here so I trust your judgment

However you implement it I want to either put <prompt> in my paste buffer so I can use it or somehow display the prompt so I can easily copy and paste it

<prompt>
Using the photos in public/photos/nemac_staff/ I would like you 
to create a page in src/pages/Claude_Code_Nemac.jsx and add a new
route to src/App.jsx to navigate to claudeNemac

The order and details of the photos are:
name, image, title
1. Karin Rogers, public/photos/nemac_staff/karin.png Director
2. Greg Dobson, public/photos/nemac_staff/greg.jpeg, Director of 
GIS and Engagement
3. Dave Michelson, public/photos/nemac_staff/lol_dave.png, Chief 
LOL Officer
4. Jessica Orlando, public/photos/nemac_staff/jessica.jpeg, 
Geospatial Research Scientist
5. Ian Johnson, public/photos/nemac_staff/ian.jpeg, Senior 
Geospatial Analyst
6. Ashlyn Dunsworth, public/photos/nemac_staff/ashlyn.jpeg, 
Science Editor
7. Jeff Bliss, public/photos/nemac_staff/jeff.jpeg, Senior 
Software Developer
8. Grace Chien, public/photos/nemac_staff/grace.jpeg, UX Designer
9. Cynthia Fountain, public/photos/nemac_staff/cynthia.png, 
Administrative Associate
10. Dani Levy, public/photos/nemac_staff/dani.jpeg, Software 
Developer
11. Gina Martinez, public/photos/nemac_staff/gina.png, UX 
Designer

You will use public/design/claude_code_nemac.pdf as your design 
template with the following implementation details:
- Yellow squiggly line up top says "About NEMAC" as the title of 
this page
- Information about staff members are in the green boxes, NAME, 
and Title. This should all be arranged in a React Material UI 
grid with size xs=12 and md=3 for a good responsive mobile and 
desktop design
- The green boxes are where the images for the respective staff 
member should be. These boxes should have a border radius of 16 
pixels and be 300x300 pixels in size
- Name should be bolded in black text
- Title should be bolded in #6c757d text
</prompt>

Additionally I'd like you to display everything in <block> to show my audience how I actually prompted you to make this. You can omit the text in <prompt> or just summarize it as "prompt"

Again you are the designer and the architect here and I fully trust you. Make it fun and exciting!`);
                  }}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: "primary.main",
                    color: "white",
                    "&:hover": {
                      bgcolor: "primary.dark",
                    },
                  }}
                  size="small"
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
            </Paper>

            <Box
              sx={{
                display: "flex",
                gap: 3,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Button
                variant="contained"
                size="large"
                sx={{
                  bgcolor: "#FFD700",
                  color: "#333",
                  fontWeight: "bold",
                  px: 4,
                  py: 2,
                  fontSize: "1.2rem",
                  "&:hover": {
                    bgcolor: "#FFC700",
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 15px rgba(255, 215, 0, 0.4)",
                }}
                onClick={() => {
                  navigator.clipboard
                    .writeText(`Using the photos in public/photos/nemac_staff/ I would like you 
to create a page in src/pages/Claude_Code_Nemac.jsx and add a new
route to src/App.jsx to navigate to claudeNemac

The order and details of the photos are:
name, image, title
1. Karin Rogers, public/photos/nemac_staff/karin.png Director
2. Greg Dobson, public/photos/nemac_staff/greg.jpeg, Director of 
GIS and Engagement
3. Dave Michelson, public/photos/nemac_staff/lol_dave.png, Chief 
LOL Officer
4. Jessica Orlando, public/photos/nemac_staff/jessica.jpeg, 
Geospatial Research Scientist
5. Ian Johnson, public/photos/nemac_staff/ian.jpeg, Senior 
Geospatial Analyst
6. Ashlyn Dunsworth, public/photos/nemac_staff/ashlyn.jpeg, 
Science Editor
7. Jeff Bliss, public/photos/nemac_staff/jeff.jpeg, Senior 
Software Developer
8. Grace Chien, public/photos/nemac_staff/grace.jpeg, UX Designer
9. Cynthia Fountain, public/photos/nemac_staff/cynthia.png, 
Administrative Associate
10. Dani Levy, public/photos/nemac_staff/dani.jpeg, Software 
Developer
11. Gina Martinez, public/photos/nemac_staff/gina.png, UX 
Designer

You will use public/design/claude_code_nemac.pdf as your design 
template with the following implementation details:
- Yellow squiggly line up top says "About NEMAC" as the title of 
this page
- Information about staff members are in the green boxes, NAME, 
and Title. This should all be arranged in a React Material UI 
grid with size xs=12 and md=3 for a good responsive mobile and 
desktop design
- The green boxes are where the images for the respective staff 
member should be. These boxes should have a border radius of 16 
pixels and be 300x300 pixels in size
- Name should be bolded in black text
- Title should be bolded in #6c757d text`);
                }}
              >
                📋 Copy the NEMAC Prompt
              </Button>
            </Box>

            <Typography
              variant="h6"
              sx={{
                mt: 4,
                color: "rgba(255, 255, 255, 0.8)",
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              ✨ Ready to build something amazing? Give it a try! ✨
            </Typography>

            <style>
              {`
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-20px); }
                }
                @keyframes bounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-10px); }
                }
              `}
            </style>
          </Box>
        );

      case "bullets":
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              p: 4,
            }}
          >
            <Typography
              variant="h2"
              component="h1"
              sx={{
                mb: 6,
                fontWeight: "bold",
                color: "primary.main",
                textAlign: "center",
              }}
            >
              {slide.title}
            </Typography>
            <Box sx={{ maxWidth: "1000px" }}>
              {slide.bullets.map((bullet, index) => (
                <Typography
                  key={index}
                  variant="h4"
                  sx={{
                    mb: 3,
                    lineHeight: 1.6,
                    "&:before": {
                      content: '"• "',
                      fontWeight: "bold",
                      color: "primary.main",
                    },
                  }}
                >
                  {bullet === "Dave thought this presentation was about him" ? (
                    <>
                      <Box
                        component="span"
                        onClick={openDaveModal}
                        sx={{
                          cursor: "pointer",
                          color: "primary.main",
                          textDecoration: "underline",
                          "&:hover": {
                            color: "primary.dark",
                          },
                        }}
                      >
                        Dave
                      </Box>
                      {" thought this presentation was about him"}
                    </>
                  ) : (
                    bullet
                  )}
                </Typography>
              ))}
            </Box>
          </Box>
        );

      case "image":
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100vh",
              p: 4,
              position: "relative",
              bgcolor: "black",
            }}
          >
            {/* Title - Always visible */}
            <Typography
              variant="h2"
              component="h1"
              sx={{
                mb: 6,
                fontWeight: "bold",
                color: "white",
                textAlign: "center",
                zIndex: 10,
                position: "relative",
              }}
            >
              {slide.title}
            </Typography>

            {/* Image Container */}
            <Box
              sx={{
                width: "75%",
                height: "60vh",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #333",
              }}
            >
              {/* Loading Spinner */}
              {animationPhase === "loading" && (
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    bgcolor: "#222",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <CircularProgress
                    size={80}
                    sx={{
                      color: "white",
                    }}
                  />
                  <Typography
                    variant="h4"
                    sx={{ color: "#ccc", textAlign: "center" }}
                  >
                    Loading...
                  </Typography>
                </Box>
              )}

              {/* Final Image */}
              {animationPhase === "complete" && (
                <Box
                  component="img"
                  src="aw_snap.png"
                  alt={slide.title}
                  onClick={handleImageClick}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    cursor: "pointer",
                    "&:hover": {
                      transform: "scale(1.02)",
                    },
                    transition: "transform 0.2s ease-in-out",
                  }}
                />
              )}
            </Box>
          </Box>
        );

      case "appalachian":
        return (
          <Box
            sx={{
              minHeight: "100vh",
              bgcolor: "black",
              color: "#FFE81F",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              fontFamily:
                "'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif",
            }}
          >
            {appalachianPhase === "waiting" && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: "#FFE81F",
                    opacity: 0.7,
                  }}
                >
                  Loading...
                </Typography>
              </Box>
            )}

            {appalachianPhase === "title" && (
              <Typography
                variant="h1"
                sx={{
                  fontSize: "8rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  letterSpacing: "0.2em",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                  animation: "titleShrink 4s ease-out forwards",
                  transformOrigin: "center center",
                  "@keyframes titleShrink": {
                    "0%": {
                      transform: "scale(1) translateZ(0)",
                      opacity: 1,
                    },
                    "100%": {
                      transform: "scale(0.1) translateZ(-1000px)",
                      opacity: 0,
                    },
                  },
                }}
              >
                APPALACHIAN
                <br />
                TRAIL
              </Typography>
            )}

            {appalachianPhase === "scroll" && (
              <Box
                sx={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "80%",
                  maxWidth: "800px",
                  animation: "crawl 30s linear forwards",
                  transformOrigin: "center top",
                  perspective: "400px",
                  "@keyframes crawl": {
                    "0%": {
                      top: "100%",
                      transform: "translateX(-50%) rotateX(20deg)",
                    },
                    "100%": {
                      top: "-100%",
                      transform: "translateX(-50%) rotateX(20deg)",
                    },
                  },
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    color: "#FFE81F",
                    textAlign: "justify",
                    lineHeight: 1.8,
                    fontSize: "2.5rem",
                    fontWeight: "bold",
                    letterSpacing: "0.1em",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                    whiteSpace: "pre-line",
                  }}
                >
                  {slide.details}
                </Typography>
              </Box>
            )}

            <style>
              {`
                @keyframes titleShrink {
                  0% {
                    transform: scale(1) translateZ(0);
                    opacity: 1;
                  }
                  100% {
                    transform: scale(0.1) translateZ(-1000px);
                    opacity: 0;
                  }
                }
                
                @keyframes crawl {
                  0% {
                    top: 100%;
                    transform: translateX(-50%) rotateX(20deg);
                  }
                  100% {
                    top: -100%;
                    transform: translateX(-50%) rotateX(20deg);
                  }
                }
              `}
            </style>
          </Box>
        );

      case "quiz":
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "80vh",
              p: 4,
            }}
          >
            <Typography
              variant="h2"
              component="h1"
              sx={{
                mb: 4,
                fontWeight: "bold",
                color: "primary.main",
                textAlign: "center",
              }}
            >
              {slide.title}
            </Typography>
            <QuizModal
              key={`quiz-${currentSlide}-${slide.quizIndex}`}
              quizIndex={slide.quizIndex}
              onQuizComplete={() => {
                console.log("Quiz completed!");
              }}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ position: "relative", minHeight: "100vh" }}>
      {renderSlideContent()}

      {/* Navigation */}
      <Box
        sx={{
          position: "fixed",
          bottom: 40,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 2,
          zIndex: 1000,
        }}
      >
        <Button
          variant="contained"
          onClick={prevSlide}
          startIcon={<ArrowBack />}
          disabled={currentSlide === 0}
        >
          Previous
        </Button>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2,
            bgcolor: "background.paper",
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="body1">
            {currentSlide + 1} /{" "}
            {currentSlide <= 4 ? slidesData.length - 2 : slidesData.length}
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={nextSlide}
          endIcon={<ArrowForward />}
          sx={{
            display: currentSlide === 4 ? "none" : "flex",
          }}
        >
          {currentSlide === slidesData.length - 1
            ? "Go to NEMAC Presentation"
            : "Next"}
        </Button>
      </Box>

      {/* Video Modal */}
      <Modal
        open={isVideoOpen}
        onClose={closeVideo}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            bgcolor: "black",
            outline: "none",
          }}
        >
          <IconButton
            onClick={closeVideo}
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 1001,
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
              },
            }}
          >
            <Close />
          </IconButton>
          <iframe
            src="https://drive.google.com/file/d/1XaS__pata90QQH-lgHaiJdydx2zgfHbO/preview#t=43s"
            width="100%"
            height="100%"
            style={{
              border: "none",
            }}
            allow="autoplay"
            title="Appalachian Trail Introduction Video"
          />
        </Box>
      </Modal>

      {/* Dave Modal */}
      <Modal
        open={isDaveModalOpen}
        onClose={closeDaveModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90vw",
            height: "90vh",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            overflow: "hidden",
            display: "flex",
          }}
        >
          <IconButton
            onClick={closeDaveModal}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1001,
              backgroundColor: "rgba(0, 0, 0, 0.1)",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.2)",
              },
            }}
          >
            <Close />
          </IconButton>

          {/* PDF Section - 25% */}
          <Box
            sx={{
              width: "25%",
              height: "100%",
              borderRight: 1,
              borderColor: "divider",
            }}
          >
            <iframe
              src="design/dave_page.pdf"
              width="100%"
              height="100%"
              style={{
                border: "none",
              }}
              title="Dave Page PDF"
            />
          </Box>

          {/* Dave Component Section - 75% */}
          <Box
            sx={{
              width: "75%",
              height: "100%",
              overflow: "auto",
              p: 2,
            }}
          >
            <Dave />
          </Box>
        </Box>
      </Modal>

      {/* PDF Modal */}
      <Modal
        open={isPdfModalOpen}
        onClose={closePdfModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            bgcolor: "black",
            outline: "none",
          }}
        >
          <IconButton
            onClick={closePdfModal}
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 1001,
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
              },
            }}
          >
            <Close />
          </IconButton>
          <iframe
            src="design/claude_code_nemac.pdf"
            width="100%"
            height="100%"
            style={{
              border: "none",
            }}
            title="Claude Code NEMAC PDF"
          />
        </Box>
      </Modal>

      {/* Code Modal */}
      <Modal
        open={isCodeModalOpen}
        onClose={closeCodeModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "95vw",
            height: "95vh",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            overflow: "hidden",
          }}
        >
          <IconButton
            onClick={closeCodeModal}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1001,
              backgroundColor: "rgba(0, 0, 0, 0.1)",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.2)",
              },
            }}
          >
            <Close />
          </IconButton>
          <Box
            sx={{
              width: "100%",
              height: "100%",
              overflow: "auto",
              p: 2,
            }}
          >
            <Claude_Code_Jeff />
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default Slides;
