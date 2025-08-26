import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  CardActionArea,
  CardActions,
  IconButton,
  Modal,
  Backdrop,
  Grid,
} from "@mui/material";
import {
  ArrowBack,
  ArrowForward,
  Close,
  Fullscreen,
  FullscreenExit,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import { presentation } from "../nemacPresentation.js";
import QuizModal from "../components/QuizModal.jsx";
import Interrupt from "../components/Interrupt.jsx";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const NemacPresentation = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [map, setMap] = useState(null);
  const [atCenterLine, setAtCenterLine] = useState(null);
  const [displayedMiles, setDisplayedMiles] = useState(0);
  const [isCardFullscreen, setIsCardFullscreen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [showInterrupt, setShowInterrupt] = useState(false);
  const counterRef = useRef(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      *::-webkit-scrollbar {
        display: none !important;
      }
      html, body {
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const slides = Object.values(presentation[0]);
  const totalSlides = slides.length;

  const goToNextSlide = () => {
    const nextSlide = (currentSlide + 1) % totalSlides;
    setCurrentSlide(nextSlide);
    const nextSlideData = slides[nextSlide];
    if (nextSlideData && nextSlideData.interrupt) {
      setShowInterrupt(true);
    }
  };

  const goToPrevSlide = () => {
    const prevSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    setCurrentSlide(prevSlide);
    const prevSlideData = slides[prevSlide];
    if (prevSlideData && prevSlideData.interrupt) {
      setShowInterrupt(true);
    }
  };

  const handleSeeOnMap = () => {
    const currentSlideData = slides[currentSlide];
    navigate(
      `/appalachiantrail?state=${currentSlideData.state}&day=${currentSlideData.day}`,
    );
  };

  const handleCardClick = () => {
    if (currentSlide === 0) {
      console.log("whoops");
    } else if (currentSlideData.photos) {
      setCurrentImageIndex(0);
      setIsGalleryOpen(true);
    }
  };

  const handleCloseGallery = () => {
    setIsGalleryOpen(false);
    setCurrentImageIndex(0);
  };

  const toggleCardFullscreen = () => {
    setIsCardFullscreen(!isCardFullscreen);
  };

  const toggleMapFullscreen = () => {
    setIsMapFullscreen(!isMapFullscreen);
  };

  const closeVideo = () => {
    setIsVideoOpen(false);
  };

  const handleQuizClick = () => {
    setIsQuizOpen(true);
  };

  const closeQuiz = () => {
    setIsQuizOpen(false);
  };

  const handleInterruptComplete = () => {
    setShowInterrupt(false);
  };

  const goToNextImage = () => {
    const currentSlideData = slides[currentSlide];
    if (currentSlideData.photos) {
      setCurrentImageIndex(
        (prev) => (prev + 1) % currentSlideData.photos.length,
      );
    }
  };

  const goToPrevImage = () => {
    const currentSlideData = slides[currentSlide];
    if (currentSlideData.photos) {
      setCurrentImageIndex(
        (prev) =>
          (prev - 1 + currentSlideData.photos.length) %
          currentSlideData.photos.length,
      );
    }
  };

  useEffect(() => {
    if (map && currentSlide >= 0) {
      const currentSlideData = slides[currentSlide];
      if (currentSlideData && currentSlideData.coordinates) {
        const zoomLevel = currentSlideData.zoomLevel || 10;
        map.flyTo(currentSlideData.coordinates, zoomLevel, {
          animate: true,
        });
      }
    }
  }, [map, currentSlide, slides]);

  useEffect(() => {
    const trailUrl =
      "https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/ANST_Facilities/FeatureServer/7/query?where=1%3D1&outFields=*&f=geojson";

    fetch(trailUrl)
      .then((response) => response.json())
      .then((data) => {
        setAtCenterLine(data);
      })
      .catch((error) => {
        console.error("Error fetching trail data:", error);
      });
  }, []);

  useEffect(() => {
    const targetMiles = currentSlideData.milesWalked;
    const startMiles = displayedMiles;
    const difference = targetMiles - startMiles;

    if (Math.abs(difference) < 0.1) {
      setDisplayedMiles(targetMiles);
      return;
    }

    const duration = 3000;
    const startTime = Date.now();

    const updateCounter = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      const currentMiles = startMiles + difference * easeOutQuad;

      setDisplayedMiles(currentMiles);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setDisplayedMiles(targetMiles);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [currentSlide]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (isGalleryOpen) {
        if (event.key === "ArrowLeft") {
          goToPrevImage();
        } else if (event.key === "ArrowRight") {
          goToNextImage();
        } else if (event.key === "Escape") {
          handleCloseGallery();
        }
      } else {
        if (event.key === "ArrowLeft") {
          goToPrevSlide();
        } else if (event.key === "ArrowRight") {
          goToNextSlide();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isGalleryOpen, currentSlide]);

  const currentSlideData = slides[currentSlide];

  return (
    <Box
      sx={{
        height: "99vh",
        width: "99vw",
        overflow: "hidden",
      }}
    >
      <Grid
        container
        sx={{
          height: "100%",
          width: "100%",
        }}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              width: "100%",
              height: "100%",
              position: "relative",
              borderRadius: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <CardActionArea
              onClick={handleCardClick}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                maxHeight: "90%",
              }}
            >
              <CardMedia
                component="img"
                image={currentSlideData.heroImage}
                alt={currentSlideData.title}
                sx={{
                  objectFit: "contain",
                  width: "100%",
                  height: "70vh",
                  maxHeight: "70vh",
                }}
              />
              <CardContent sx={{ flex: "0 0 auto" }}>
                <Typography gutterBottom variant="h4" component="div">
                  {currentSlideData.title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontSize: "20px", color: "text.secondary" }}
                >
                  {currentSlideData.details}
                </Typography>

                <Box
                  sx={{
                    mt: 2,
                    p: 1,
                    backgroundColor: "#000",
                    border: "2px solid #333",
                    borderRadius: 1,
                    fontFamily: "monospace",
                    fontSize: "18px",
                    color: "#00ff00",
                    textAlign: "center",
                    letterSpacing: "2px",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontFamily: "monospace",
                      fontSize: "14px",
                      color: "#00ff00",
                      mb: 0.5,
                      minWidth: "650px",
                    }}
                  >
                    MILES WALKED
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: "monospace",
                      fontSize: "20px",
                      color: "#00ff00",
                      fontWeight: "bold",
                    }}
                  >
                    {displayedMiles.toFixed(1)}
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
            <CardActions>
              <Button size="small" color="primary" onClick={handleSeeOnMap}>
                See on map
              </Button>
              {/*{currentSlideData.quiz && (*/}
              {/*  <Button*/}
              {/*    size="small"*/}
              {/*    color="secondary"*/}
              {/*    onClick={handleQuizClick}*/}
              {/*  >*/}
              {/*    Quiz*/}
              {/*  </Button>*/}
              {/*)}*/}
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              height: "100%",
              borderRadius: 0,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <IconButton
              onClick={toggleMapFullscreen}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 1000,
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                },
              }}
            >
              {isMapFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
            <MapContainer
              center={currentSlideData.coordinates}
              zoom={currentSlideData.zoomLevel || 12}
              style={{ height: "100%", width: "100%" }}
              ref={setMap}
            >
              <TileLayer
                url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; <a href="https://www.usgs.gov/">U.S. Geological Survey</a>'
              />

              {atCenterLine && (
                <GeoJSON
                  data={atCenterLine}
                  style={() => ({
                    color: "#387037",
                    weight: 4,
                    opacity: 0.8,
                  })}
                />
              )}

              <Marker position={currentSlideData.coordinates}>
                <Popup>
                  <strong>{currentSlideData.title}</strong>
                  <br />
                  {currentSlideData.details}
                </Popup>
              </Marker>
            </MapContainer>
          </Box>
        </Grid>
      </Grid>

      {/* Map Fullscreen Modal */}
      <Modal
        open={isMapFullscreen}
        onClose={toggleMapFullscreen}
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
            bgcolor: "background.paper",
            outline: "none",
          }}
        >
          <IconButton
            onClick={toggleMapFullscreen}
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
            <FullscreenExit />
          </IconButton>
          <MapContainer
            center={currentSlideData.coordinates}
            zoom={currentSlideData.zoomLevel || 9}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.usgs.gov/">U.S. Geological Survey</a>'
            />

            {atCenterLine && (
              <GeoJSON
                data={atCenterLine}
                style={() => ({
                  color: "#387037",
                  weight: 4,
                  opacity: 0.8,
                })}
              />
            )}

            <Marker position={currentSlideData.coordinates}>
              <Popup>
                <strong>{currentSlideData.title}</strong>
                <br />
                {currentSlideData.details}
              </Popup>
            </Marker>
          </MapContainer>
        </Box>
      </Modal>

      {/* Video Modal for Slide 0 */}
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
            src="https://drive.google.com/file/d/1XaS__pata90QQH-lgHaiJdydx2zgfHbO/preview"
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

      {/* Quiz Modal */}
      <Modal
        open={isQuizOpen}
        onClose={closeQuiz}
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
          <IconButton
            onClick={closeQuiz}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1001,
            }}
          >
            <Close />
          </IconButton>
          {currentSlideData.quiz && (
            <QuizModal
              quizIndex={currentSlideData.quiz}
              onQuizComplete={closeQuiz}
            />
          )}
        </Box>
      </Modal>

      {/* Photo Gallery Modal */}
      <Modal
        open={isGalleryOpen}
        onClose={handleCloseGallery}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: { backgroundColor: "rgba(0, 0, 0, 0.9)" },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            outline: "none",
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={handleCloseGallery}
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 1001,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "white",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              },
            }}
          >
            <Close />
          </IconButton>

          {/* Previous Button */}
          {currentSlideData.photos && currentSlideData.photos.length > 1 && (
            <IconButton
              onClick={goToPrevImage}
              sx={{
                position: "absolute",
                left: 16,
                zIndex: 1001,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                },
              }}
            >
              <ArrowBack />
            </IconButton>
          )}

          {/* Next Button */}
          {currentSlideData.photos && currentSlideData.photos.length > 1 && (
            <IconButton
              onClick={goToNextImage}
              sx={{
                position: "absolute",
                right: 16,
                zIndex: 1001,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                },
              }}
            >
              <ArrowForward />
            </IconButton>
          )}

          {/* Photo Display */}
          {currentSlideData.photos && (
            <Box
              component="img"
              src={currentSlideData.photos[currentImageIndex]}
              alt={`Photo ${currentImageIndex + 1}`}
              sx={{
                maxWidth: "95vw",
                maxHeight: "95vh",
                objectFit: "contain",
                borderRadius: 1,
              }}
            />
          )}

          {/* Photo Counter */}
          {currentSlideData.photos && currentSlideData.photos.length > 1 && (
            <Typography
              sx={{
                position: "absolute",
                bottom: 16,
                left: "50%",
                transform: "translateX(-50%)",
                color: "white",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                px: 2,
                py: 1,
                borderRadius: 1,
              }}
            >
              {currentImageIndex + 1} / {currentSlideData.photos.length}
            </Typography>
          )}
        </Box>
      </Modal>

      {/* Interrupt Component */}
      <Interrupt
        interrupt={showInterrupt}
        quizIndex={currentSlideData.interrupt_quiz_id}
        onInterruptComplete={handleInterruptComplete}
      />
    </Box>
  );
};

export default NemacPresentation;
