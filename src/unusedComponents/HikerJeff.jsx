import { useState, useRef } from "react";
import { Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import appalachianTrailDetails from "../data/AppalachianTrailDetails.js";

// this variable is the ORIG_FID order from Springer
// to Katahdin from https://nps.maps.arcgis.com/apps/webappviewer/index.html?id=6298c848ba2a490588b7f6d25453e4e0
// special exception for 28 - it goes to 27 and then back to 28
// 28 goes back to 27
// 30 to 7 back to 30
// 29 goes to 0 goes to 29
// 3 goes to 5 goes to 3
// 4 goes to 20 goes to 4

const trailClubSectionOrder = [
  9, 13, 21, 6, 23, 12, 18, 28, 27, 28, 27, 14, 24, 16, 19, 30, 7, 30, 26, 22,
  29, 0, 29, 17, 3, 5, 3, 15, 2, 1, 10, 8, 4, 20, 4, 11,
];

const HikerJeff = ({
  currentPoint,
  onPointChange,
  triggerAnimation,
  trailData,
  trailClubSections,
}) => {
  const [position, setPosition] = useState(() => {
    const coords = findPointCoordinates(currentPoint);
    return coords || [34.66620061252325, -84.13640405974544]; // Default to point 1
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [zoom, setZoom] = useState(6);
  const [lastTrigger, setLastTrigger] = useState(null);
  const [currentTarget, setCurrentTarget] = useState(null);
  const audioRef = useRef(null);
  const animationRef = useRef(null);

  useMapEvents({
    zoomend: (e) => {
      setZoom(e.target.getZoom());
    },
  });

  function findPointCoordinates(dayNumber) {
    const dayWithPoint = appalachianTrailDetails.find((dayData) => {
      const dayKey = Object.keys(dayData)[0];
      const currentDayNumber = parseInt(dayKey.split(" ")[1]);
      return currentDayNumber === dayNumber;
    });

    if (dayWithPoint) {
      const dayKey = Object.keys(dayWithPoint)[0];
      const day = dayWithPoint[dayKey];
      return day.startingCoordinates;
    }
    return null;
  }

  function getOrderedTrailCoordinates() {
    if (!trailData || !trailData.features || !trailClubSections || !trailClubSections.features) return [];

    let orderedCoords = [];

    // Process each section in the correct order
    trailClubSectionOrder.forEach((sectionId) => {
      // Find the club section with matching ORIG_FID
      const clubSection = trailClubSections.features.find(
        (f) => f.properties && f.properties.ORIG_FID === sectionId,
      );

      if (clubSection && clubSection.properties.ACROYNM) {
        // Find trail centerline features that match the club's acronym
        const sectionTrailFeatures = trailData.features.filter((trailFeature) => {
          return trailFeature.properties && 
                 trailFeature.properties.Acronym === clubSection.properties.ACROYNM;
        });

        // Collect all coordinates from matching trail features and maintain order
        let sectionCoords = [];
        sectionTrailFeatures.forEach((feature) => {
          if (feature.geometry.type === "LineString") {
            // Use every coordinate for continuous trail
            const coords = feature.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
            sectionCoords = sectionCoords.concat(coords);
          } else if (feature.geometry.type === "MultiLineString") {
            feature.geometry.coordinates.forEach((lineString) => {
              const coords = lineString.map((coord) => [coord[1], coord[0]]);
              sectionCoords = sectionCoords.concat(coords);
            });
          }
        });

        if (sectionCoords.length > 0) {
          // For northbound travel, sort by latitude (ascending) to ensure proper direction
          sectionCoords.sort((a, b) => a[0] - b[0]);
          orderedCoords = orderedCoords.concat(sectionCoords);
        }
      }
    });

    return orderedCoords;
  }


  function animateToPoint(targetPoint) {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }

    const orderedCoords = getOrderedTrailCoordinates();
    if (orderedCoords.length === 0) return;

    setIsAnimating(true);
    playAudioWithFadeOut();

    // Find current day's approximate position in trail (based on day progression)
    const totalDays = 193;
    const currentDayRatio = (currentPoint - 1) / (totalDays - 1);
    const targetDayRatio = (targetPoint - 1) / (totalDays - 1);
    
    // Map day ratios to coordinate array indices
    const startIndex = Math.floor(currentDayRatio * (orderedCoords.length - 1));
    const endIndex = Math.floor(targetDayRatio * (orderedCoords.length - 1));
    
    let currentIndex = startIndex;
    const direction = endIndex > startIndex ? 1 : -1;
    const animationSpeed = 20; // milliseconds between steps
    const stepSize = 1; // Move 1 coordinate at a time for smooth walking

    const animateAlongTrail = () => {
      if (
        (direction === 1 && currentIndex <= endIndex) ||
        (direction === -1 && currentIndex >= endIndex)
      ) {
        if (orderedCoords[currentIndex]) {
          setPosition(orderedCoords[currentIndex]);
        }
        currentIndex += direction * stepSize;
        animationRef.current = setTimeout(animateAlongTrail, animationSpeed);
      } else {
        setIsAnimating(false);
        onPointChange(targetPoint);
        // Set final position to the actual day coordinates if available
        const targetCoords = findPointCoordinates(targetPoint);
        if (targetCoords) {
          setPosition(targetCoords);
        }
      }
    };

    animateAlongTrail();
  }

  function playAudioWithFadeOut() {
    if (audioRef.current) {
      audioRef.current.volume = 1;
      audioRef.current.currentTime = 0;
      audioRef.current.play();

      setTimeout(() => {
        if (audioRef.current) {
          const fadeOutInterval = setInterval(() => {
            if (audioRef.current.volume > 0.05) {
              audioRef.current.volume -= 0.05;
            } else {
              audioRef.current.pause();
              clearInterval(fadeOutInterval);
            }
          }, 100);
        }
      }, 10000);
    }
  }

  if (triggerAnimation && triggerAnimation !== lastTrigger) {
    setLastTrigger(triggerAnimation);
    animateToPoint(currentPoint);
  }

  const baseMarkerSize = 50;
  const scaledSize = Math.max(baseMarkerSize, (baseMarkerSize / zoom) * 8);

  const hikerIcon = L.divIcon({
    className: "ascii-hiker-icon",
    html: `<img src="/hikerjeff.jpg" style="width: ${scaledSize}px; height: ${scaledSize}px; border-radius: 50%; border: 2px solid #ff6b35; box-shadow: 0 2px 8px rgba(0,0,0,0.5);" />`,
    iconSize: [scaledSize, scaledSize],
    iconAnchor: [scaledSize / 2, scaledSize / 2],
    zIndex: 9999,
  });

  return (
    <>
      <Marker position={position} icon={hikerIcon} />
      <audio ref={audioRef} preload="auto">
        <source src="/IWouldWalk500Miles.mp3" type="audio/mpeg" />
      </audio>
    </>
  );
};

export default HikerJeff;
