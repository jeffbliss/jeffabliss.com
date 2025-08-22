import { Typography, Box, Container, Button } from "@mui/material";
import { useState } from "react";
import Navbar from "./Navbar";

const AppalachianTrail = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to my AI presentation",
      subtitle: "Created by Jeff Bliss and Claude AI",
    },
    {
      title: "Enjoy NEMACians!",
      subtitle: "Greg made this happen",
    },
    {
      title: "Appalachian Trail Bitches!",
      subtitle: "Thanks Greg! :)",
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <>
      <Navbar />

      <Container>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "80vh",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              border: 2,
              borderColor: "primary.main",
              borderRadius: 2,
              p: 4,
              mb: 4,
              minWidth: "400px",
              backgroundColor: "background.paper",
            }}
          >
            <Typography variant="h2" component="h1" gutterBottom>
              {slides[currentSlide].title}
            </Typography>
          </Box>

          <Box
            sx={{
              border: 2,
              borderColor: "primary.main",
              borderRadius: 2,
              p: 3,
              mb: 6,
              minWidth: "350px",
              backgroundColor: "background.paper",
            }}
          >
            <Typography variant="h4" component="p">
              {slides[currentSlide].subtitle}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Button
              variant="outlined"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              sx={{ minWidth: "100px" }}
            >
              ← PREV
            </Button>

            <Typography variant="body1" sx={{ mx: 2 }}>
              {currentSlide + 1} / {slides.length}
            </Typography>

            <Button
              variant="outlined"
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              sx={{ minWidth: "100px" }}
            >
              NEXT →
            </Button>
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default AppalachianTrail;
