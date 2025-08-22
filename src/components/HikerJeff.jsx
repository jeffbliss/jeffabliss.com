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

  function findClosestPointOnTrail(targetCoord, trailCoords, searchStart = 0) {
    let minDistance = Infinity;
    let closestIndex = searchStart;

    for (let i = searchStart; i < trailCoords.length; i++) {
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

  // Approach 1: Find all close points and pick the best sequence
  function findBestTrailSequence(startCoords, endCoords, allTrailCoords) {
    // Find multiple candidate points near start and end
    const startCandidates = findNearestPoints(startCoords, allTrailCoords, 5);
    const endCandidates = findNearestPoints(endCoords, allTrailCoords, 5);

    let bestPath = [];
    let shortestValidPath = Infinity;

    // Try different combinations to find the best forward path
    for (const startCandidate of startCandidates) {
      for (const endCandidate of endCandidates) {
        if (endCandidate.index > startCandidate.index) {
          const pathLength = endCandidate.index - startCandidate.index;

          // Prefer shorter paths that still make geographic sense
          if (
            pathLength < shortestValidPath &&
            pathLength < allTrailCoords.length * 0.1
          ) {
            bestPath = allTrailCoords.slice(
              startCandidate.index,
              endCandidate.index + 1,
            );
            shortestValidPath = pathLength;
          }
        }
      }
    }

    return bestPath;
  }

  function findNearestPoints(targetCoord, trailCoords, count = 5) {
    const distances = trailCoords.map((coord, index) => ({
      index,
      distance: Math.sqrt(
        Math.pow(coord[0] - targetCoord[0], 2) +
          Math.pow(coord[1] - targetCoord[1], 2),
      ),
    }));

    return distances.sort((a, b) => a.distance - b.distance).slice(0, count);
  }

  // Approach 2: Build path day by day using trail segments
  function getTrailPathDayByDay(startPoint, endPoint) {
    const allCoords = getAllTrailCoordinates();
    if (allCoords.length === 0) return [];

    let fullPath = [];
    const direction = startPoint < endPoint ? 1 : -1;
    let lastTrailIndex = null;

    // Walk through each day from start to end
    for (let day = startPoint; day !== endPoint + direction; day += direction) {
      const currentDayCoords = findPointCoordinates(day);
      if (!currentDayCoords) continue;

      if (lastTrailIndex === null) {
        // First day - just find starting point on trail
        lastTrailIndex = findClosestPointOnTrail(currentDayCoords, allCoords);
        fullPath.push(allCoords[lastTrailIndex]);
      } else {
        // Find next day's position, but only search forward from last position
        const searchStart = lastTrailIndex + 1;
        const searchWindow = 1000; // Look ahead this many points
        const searchEnd = Math.min(
          allCoords.length,
          searchStart + searchWindow,
        );

        let bestIndex = searchStart;
        let minDistance = Infinity;

        for (let i = searchStart; i < searchEnd; i++) {
          const distance = Math.sqrt(
            Math.pow(allCoords[i][0] - currentDayCoords[0], 2) +
              Math.pow(allCoords[i][1] - currentDayCoords[1], 2),
          );
          if (distance < minDistance) {
            minDistance = distance;
            bestIndex = i;
          }
        }

        // Add trail segment from last position to current position
        const segmentStart = lastTrailIndex;
        const segmentEnd = bestIndex;

        if (segmentEnd > segmentStart) {
          const segment = allCoords.slice(segmentStart + 1, segmentEnd + 1);
          fullPath.push(...segment);
          lastTrailIndex = segmentEnd;
        } else {
          // If we can't find a good forward path, add some interpolated points
          const steps = 20;
          const startCoord = allCoords[lastTrailIndex];
          for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const lat =
              startCoord[0] + (currentDayCoords[0] - startCoord[0]) * progress;
            const lng =
              startCoord[1] + (currentDayCoords[1] - startCoord[1]) * progress;
            fullPath.push([lat, lng]);
          }
        }
      }
    }

    return fullPath;
  }

  // Approach 3: Geographic corridor search
  function getTrailPathWithCorridor(startCoords, endCoords) {
    const allCoords = getAllTrailCoordinates();
    if (allCoords.length === 0) return [];

    // Create a geographic "corridor" between start and end points
    const corridorWidth = 0.01; // Adjust based on your coordinate system

    // Filter trail points that fall within the corridor
    const corridorPoints = allCoords
      .filter((coord, index) => {
        return isPointInCorridor(coord, startCoords, endCoords, corridorWidth);
      })
      .map((coord, filteredIndex, filteredArray) => {
        // Find original index
        const originalIndex = allCoords.findIndex(
          (c) => c[0] === coord[0] && c[1] === coord[1],
        );
        return { coord, originalIndex };
      });

    if (corridorPoints.length === 0) {
      // Fallback to simple interpolation
      return createInterpolatedPath(startCoords, endCoords, 50);
    }

    // Sort corridor points by their original trail order
    corridorPoints.sort((a, b) => a.originalIndex - b.originalIndex);

    // Find best start and end points in the corridor
    let bestStart = corridorPoints[0];
    let bestEnd = corridorPoints[corridorPoints.length - 1];

    // Refine start point
    for (const point of corridorPoints) {
      const distToStart = getDistance(point.coord, startCoords);
      if (distToStart < getDistance(bestStart.coord, startCoords)) {
        bestStart = point;
      }
    }

    // Refine end point (must come after start)
    for (const point of corridorPoints) {
      if (point.originalIndex > bestStart.originalIndex) {
        const distToEnd = getDistance(point.coord, endCoords);
        if (distToEnd < getDistance(bestEnd.coord, endCoords)) {
          bestEnd = point;
        }
      }
    }

    // Extract path between refined start and end
    const pathStart = bestStart.originalIndex;
    const pathEnd = bestEnd.originalIndex;

    return allCoords.slice(pathStart, pathEnd + 1);
  }

  function isPointInCorridor(point, start, end, width) {
    // Simple corridor check - point should be reasonably close to the line between start and end
    const distanceToLine = distanceFromPointToLine(point, start, end);
    return distanceToLine <= width;
  }

  function distanceFromPointToLine(point, lineStart, lineEnd) {
    const A = point[0] - lineStart[0];
    const B = point[1] - lineStart[1];
    const C = lineEnd[0] - lineStart[0];
    const D = lineEnd[1] - lineStart[1];

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    const param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = lineStart[0];
      yy = lineStart[1];
    } else if (param > 1) {
      xx = lineEnd[0];
      yy = lineEnd[1];
    } else {
      xx = lineStart[0] + param * C;
      yy = lineStart[1] + param * D;
    }

    const dx = point[0] - xx;
    const dy = point[1] - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getDistance(coord1, coord2) {
    return Math.sqrt(
      Math.pow(coord1[0] - coord2[0], 2) + Math.pow(coord1[1] - coord2[1], 2),
    );
  }

  function createInterpolatedPath(start, end, steps) {
    const path = [];
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const lat = start[0] + (end[0] - start[0]) * progress;
      const lng = start[1] + (end[1] - start[1]) * progress;
      path.push([lat, lng]);
    }
    return path;
  }

  // Main function - try approaches in order of preference
  function getTrailPath(startCoords, endCoords) {
    if (!trailData) return [];

    // Try corridor approach first (best for authentic trail following)
    let path = getTrailPathWithCorridor(startCoords, endCoords);

    if (path.length < 10) {
      // Try day-by-day approach
      const startPoint = findDayFromCoords(startCoords);
      const endPoint = findDayFromCoords(endCoords);

      if (startPoint && endPoint) {
        path = getTrailPathDayByDay(startPoint, endPoint);
      }
    }

    if (path.length < 10) {
      // Fallback to best sequence approach
      const allCoords = getAllTrailCoordinates();
      path = findBestTrailSequence(startCoords, endCoords, allCoords);
    }

    if (path.length < 10) {
      // Final fallback to interpolation
      path = createInterpolatedPath(startCoords, endCoords, 50);
    }

    return path;
  }

  // Helper to find day number from coordinates
  function findDayFromCoords(coords) {
    // This would need to be implemented based on your day finding logic
    // For now, return null to skip day-by-day approach
    return null;
  }

  function animateToPoint(targetPoint) {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    console.log("animate");

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
