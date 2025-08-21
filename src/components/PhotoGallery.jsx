import { useState } from "react";
import { Box, Typography, Modal, IconButton, Fade } from "@mui/material";
import { ChevronLeft, ChevronRight, Close } from "@mui/icons-material";

const PhotoGallery = ({ open, onClose, photos, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleKeyDown = (event) => {
    if (open) {
      if (event.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
      } else if (event.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
      } else if (event.key === "Escape") {
        onClose();
      }
    }
  };

  if (!photos || photos.length === 0) return null;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
      }}
    >
      <Fade in={open} timeout={300}>
        <Box
          sx={{
            position: "relative",
            maxWidth: "80vw",
            maxHeight: "80vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              top: -50,
              right: -50,
              color: "white",
              zIndex: 1000,
            }}
          >
            <Close />
          </IconButton>

          {photos.length > 1 && (
            <IconButton
              onClick={handlePrevious}
              sx={{
                position: "absolute",
                left: -60,
                color: "white",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.7)" },
              }}
            >
              <ChevronLeft fontSize="large" />
            </IconButton>
          )}

          <Box
            sx={{
              border: "3px solid #000",
              borderRadius: "4px",
              backgroundColor: "#000",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={photos[currentIndex]}
              alt={`Photo ${currentIndex + 1}`}
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Box>

          {photos.length > 1 && (
            <IconButton
              onClick={handleNext}
              sx={{
                position: "absolute",
                right: -60,
                color: "white",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.7)" },
              }}
            >
              <ChevronRight fontSize="large" />
            </IconButton>
          )}

          {photos.length > 1 && (
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                bottom: -100,
                color: "white",
                textAlign: "center",
              }}
            >
              {currentIndex + 1} of {photos.length}
            </Typography>
          )}
        </Box>
      </Fade>
    </Modal>
  );
};

export default PhotoGallery;
