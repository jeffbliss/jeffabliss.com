import { useState, useRef } from "react";
import { Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import appalachianTrailDetails from "../data/AppalachianTrailDetails.js";

const HikerJeff = ({
  currentPoint,
  onPointChange,
  triggerAnimation,
  trailData,
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

  function getAllTrailCoordinates() {
    if (!trailData || !trailData.features) return [];

    let allCoords = [];
    trailData.features.forEach((feature) => {
      if (feature.geometry.type === "LineString") {
        allCoords.push(...feature.geometry.coordinates);
      } else if (feature.geometry.type === "MultiLineString") {
        feature.geometry.coordinates.forEach((lineString) => {
          allCoords.push(...lineString);
        });
      }
    });

    return allCoords.map((coord) => [coord[1], coord[0]]);
  }

  function findClosestPointOnTrail(targetCoord, trailCoords) {
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < trailCoords.length; i++) {
      const distance = Math.sqrt(
        Math.pow(trailCoords[i][0] - targetCoord[0], 2) +
          Math.pow(trailCoords[i][1] - targetCoord[1], 2),
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  function getTrailPath(startCoords, endCoords) {
    if (!trailData) return [];

    const allTrailCoords = getAllTrailCoordinates();
    if (allTrailCoords.length === 0) return [];

    const startIndex = findClosestPointOnTrail(startCoords, allTrailCoords);
    const endIndex = findClosestPointOnTrail(endCoords, allTrailCoords);

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    let pathCoords = allTrailCoords.slice(minIndex, maxIndex + 1);

    if (startIndex > endIndex) {
      pathCoords = pathCoords.reverse();
    }

    return pathCoords.length > 1 ? pathCoords : [startCoords, endCoords];
  }

  function animateToPoint(targetPoint) {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }

    // If we were animating to a previous target, snap to that target first
    if (currentTarget && currentTarget !== targetPoint) {
      const previousTargetCoords = findPointCoordinates(currentTarget);
      if (previousTargetCoords) {
        setPosition(previousTargetCoords);
      }
    }

    const startCoords =
      currentTarget && currentTarget !== targetPoint
        ? findPointCoordinates(currentTarget) || position
        : position;
    const endCoords = findPointCoordinates(targetPoint);

    if (!endCoords) return;

    setCurrentTarget(targetPoint);
    setIsAnimating(true);
    playAudioWithFadeOut();

    const trailPath = getTrailPath(startCoords, endCoords);

    if (trailPath.length === 0) {
      const steps = 10;
      const latDiff = (endCoords[0] - startCoords[0]) / steps;
      const lngDiff = (endCoords[1] - startCoords[1]) / steps;
      let currentStep = 0;

      const animate = () => {
        if (currentStep <= steps) {
          const newLat = startCoords[0] + latDiff * currentStep;
          const newLng = startCoords[1] + lngDiff * currentStep;
          setPosition([newLat, newLng]);
          currentStep++;
          animationRef.current = setTimeout(animate, 100);
        } else {
          setIsAnimating(false);
          setCurrentTarget(null);
          onPointChange(targetPoint);
        }
      };
      animate();
      return;
    }

    let currentPathIndex = 0;
    const totalPoints = trailPath.length;
    const animationSpeed = 1;

    const animateAlongPath = () => {
      if (currentPathIndex < totalPoints) {
        setPosition(trailPath[currentPathIndex]);
        currentPathIndex += 2;
        animationRef.current = setTimeout(animateAlongPath, animationSpeed);
      } else {
        setIsAnimating(false);
        setCurrentTarget(null);
        onPointChange(targetPoint);
      }
    };

    animateAlongPath();
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
