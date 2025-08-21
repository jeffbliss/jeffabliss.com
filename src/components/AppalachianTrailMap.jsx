import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMapEvents,
} from "react-leaflet";
import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Box, Typography, Button } from "@mui/material";
import {
  PhotoLibrary,
  NavigateBefore,
  NavigateNext,
} from "@mui/icons-material";
import appalachianTrailDetails from "../data/AppalachianTrailDetails.js";
import Navbar from "./Navbar.jsx";
import PhotoGallery from "./PhotoGallery.jsx";
import MarkerClusterGroup from "react-leaflet-markercluster";
import HikerJeff from "./HikerJeff.jsx";

// Process trail markers data outside of component
const processTrailMarkers = () => {
  const markers = [];
  appalachianTrailDetails.forEach((dayData, index) => {
    const dayKey = Object.keys(dayData)[0];
    const day = dayData[dayKey];
    const dayNumber = parseInt(dayKey.split(" ")[1]);

    if (dayNumber === 1) {
      markers.push({
        position: day.startingCoordinates,
        label: "Amicalola Falls",
        dayNumber: 1,
        isStart: true,
      });
    } else {
      markers.push({
        position: day.startingCoordinates,
        label: `Day ${dayNumber}: ${day.startingLocation}`,
        dayNumber: dayNumber,
        location: day.startingLocation,
        date: day.date,
      });
    }
    if (dayNumber === 193) {
      markers.push({
        position: day.endingCoordinates,
        label: "Mt. Katahdin",
        dayNumber: 193,
        isEnd: true,
      });
    }
  });
  return markers;
};

const trailMarkers = processTrailMarkers();

const allImages = import.meta.glob(
  "/public/photos/day_*/*.{png,jpg,jpeg,gif}",
  { eager: true },
);

const getPhotosForDay = (dayNumber) => {
  try {
    const dayPattern = `/public/photos/day_${dayNumber}/`;
    const dayImages = Object.entries(allImages)
      .filter(([path]) => path.includes(dayPattern))
      .map(([, image]) => image.default);
    return dayImages;
  } catch (error) {
    return [];
  }
};

const AppalachianTrailMap = () => {
  const mapRef = useRef(null);
  const [trailData, setTrailData] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [dayPhotos, setDayPhotos] = useState({});
  const [currentDay, setCurrentDay] = useState(1);
  const [triggerAnimation, setTriggerAnimation] = useState(false);
  const [showDayTitle, setShowDayTitle] = useState(false);

  const handleOpenGallery = (dayNumber) => {
    const photos = getPhotosForDay(dayNumber);
    if (photos && photos.length > 0) {
      setGalleryPhotos(photos);
      setGalleryOpen(true);
    }
  };

  const checkPhotoExists = (dayNumber) => {
    return dayPhotos[dayNumber] && dayPhotos[dayNumber].length > 0;
  };

  const showDayTitleAnimation = (dayNumber) => {
    setCurrentDay(dayNumber);
    setShowDayTitle(true);
    setTimeout(() => setShowDayTitle(false), 2000);
  };

  const handlePreviousPoint = () => {
    if (currentDay > 1) {
      const newDay = currentDay - 1;
      showDayTitleAnimation(newDay);
      setTriggerAnimation(Date.now());
    }
  };

  const handleNextPoint = () => {
    if (currentDay < 193) {
      const newDay = currentDay + 1;
      showDayTitleAnimation(newDay);
      setTriggerAnimation(Date.now());
    }
  };

  const handlePointChange = (newDay) => {
    setCurrentDay(newDay);
  };

  useEffect(() => {
    const trailUrl =
      "https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/ANST_Facilities/FeatureServer/7/query?where=1%3D1&outFields=*&f=geojson";
    fetch(trailUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => setTrailData(data))
      .catch((error) => console.error("Error loading trail data:", error));
  }, []);

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });

  return (
    <Box sx={{ height: "94vh", width: "100%" }}>
      <Navbar />
      <MapContainer
        center={[39.0458, -76.6413]}
        zoom={6}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* This component captures map click events */}

        {/* Appalachian Trail Centerline */}
        {trailData && (
          <GeoJSON
            data={trailData}
            style={() => ({
              color: "#387037",
              weight: 4,
              opacity: 0.8,
            })}
          />
        )}

        {/* ASCII Hiker Guy */}
        <HikerJeff
          currentPoint={currentDay}
          onPointChange={handlePointChange}
          triggerAnimation={triggerAnimation}
          trailData={trailData}
        />

        {/* Marker Cluster Group */}
        <MarkerClusterGroup>
          {trailMarkers.map((marker, index) => (
            <Marker key={index} position={marker.position}>
              <Popup>
                <Box sx={{ minWidth: 200 }}>
                  {marker.isStart ? (
                    <>
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{ fontWeight: "bold", color: "#2e7d32" }}
                      >
                        Day 1
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        component="div"
                        sx={{ fontWeight: "medium", mb: 0.5 }}
                      >
                        Amicalola Falls
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        4/1/2014
                      </Typography>
                      <Button
                        startIcon={<PhotoLibrary />}
                        onClick={() => handleOpenGallery(1)}
                        size="small"
                        sx={{ mt: 1 }}
                      >
                        View Photos
                      </Button>
                    </>
                  ) : marker.isEnd ? (
                    <>
                      <Typography
                        variant="subtitle1"
                        component="div"
                        sx={{ fontWeight: "medium", mb: 0.5 }}
                      >
                        Mt. Katahdin
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        10/10/2014
                      </Typography>
                      <Button
                        startIcon={<PhotoLibrary />}
                        onClick={() => handleOpenGallery(193)}
                        size="small"
                        sx={{ mt: 1 }}
                      >
                        View Photos
                      </Button>
                    </>
                  ) : (
                    <>
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{ fontWeight: "bold" }}
                      >
                        Day {marker.dayNumber}
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        component="div"
                        sx={{ fontWeight: "medium", mb: 0.5 }}
                      >
                        {marker.location}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {marker.date}
                      </Typography>
                      <Button
                        startIcon={<PhotoLibrary />}
                        onClick={() => handleOpenGallery(marker.dayNumber)}
                        size="small"
                        sx={{ mt: 1 }}
                      >
                        View Photos
                      </Button>
                    </>
                  )}
                </Box>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Navigation Buttons */}
      <Box
        sx={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 2,
          zIndex: 1000,
        }}
      >
        {currentDay > 1 && (
          <Button
            variant="contained"
            startIcon={<NavigateBefore />}
            onClick={handlePreviousPoint}
            sx={{
              backgroundColor: "#387037",
              "&:hover": { backgroundColor: "#2e5d2e" },
            }}
          >
            Previous Day
          </Button>
        )}
        {currentDay < 193 && (
          <Button
            variant="contained"
            endIcon={<NavigateNext />}
            onClick={handleNextPoint}
            sx={{
              backgroundColor: "#387037",
              "&:hover": { backgroundColor: "#2e5d2e" },
            }}
          >
            Next Day
          </Button>
        )}
      </Box>

      {/* Cinematic Day Title Overlay */}
      {showDayTitle && (
        <Box
          sx={{
            position: "absolute",
            top: 100,
            left: 100,
            right: 100,
            bottom: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            pointerEvents: "none",
            animation: "dayTitleAnimation 2s ease-out",
            "@keyframes dayTitleAnimation": {
              "0%": {
                opacity: 0,
                transform: "scale(0.5)",
              },
              "20%": {
                opacity: 1,
                transform: "scale(1.2)",
              },
              "100%": {
                opacity: 0,
                transform: "scale(2.0)",
              },
            },
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "4rem", sm: "6rem", md: "8rem" },
              fontWeight: "bold",
              color: "#387037",
              textShadow: "0 4px 20px rgba(0, 0, 0, 0.8)",
              fontFamily: "monospace",
              letterSpacing: "0.1em",
            }}
          >
            Day {currentDay}
          </Typography>
        </Box>
      )}

      <PhotoGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        photos={galleryPhotos}
      />
    </Box>
  );
};

export default AppalachianTrailMap;
