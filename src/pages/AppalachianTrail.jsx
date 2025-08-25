import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import appalachianTrailDetails from "../data/AppalachianTrailDetails";
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

const greenIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const states = [
  { name: "Georgia", coordinates: [34.6291, -84.1927], zoom: 9 },
  { name: "North Carolina", coordinates: [35.4041, -83.3935], zoom: 9 },
  { name: "Tennessee", coordinates: [36.5951, -82.1887], zoom: 9 },
  { name: "Virginia", coordinates: [37.5312, -78.8539], zoom: 8 },
  { name: "West Virginia", coordinates: [39.2833, -77.7964], zoom: 10 },
  { name: "Maryland", coordinates: [39.3643, -77.6238], zoom: 10 },
  { name: "Pennsylvania", coordinates: [40.3573, -76.428], zoom: 9 },
  { name: "New Jersey", coordinates: [41.1535, -74.6635], zoom: 10 },
  { name: "New York", coordinates: [41.3574, -74.0776], zoom: 9 },
  { name: "Connecticut", coordinates: [41.7658, -73.208], zoom: 10 },
  { name: "Massachusetts", coordinates: [42.4072, -72.8403], zoom: 10 },
  { name: "Vermont", coordinates: [43.4142, -72.8094], zoom: 9 },
  { name: "New Hampshire", coordinates: [44.2601, -71.3031], zoom: 9 },
  { name: "Maine", coordinates: [45.9044, -69.2187], zoom: 8 },
];

const AppalachianTrail = () => {
  const [selectedState, setSelectedState] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [map, setMap] = useState(null);
  const [atCenterLine, setAtCenterLine] = useState(null);

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

  const handleStateChange = (event) => {
    const stateName = event.target.value;
    setSelectedState(stateName);
    setSelectedDay("");

    if (map) {
      const state = states.find((s) => s.name === stateName);
      if (state) {
        map.flyTo(state.coordinates, state.zoom, {
          animate: true,
          duration: 1.5,
        });
      }
    }
  };

  const calculateMidpoint = (startCoords, endCoords) => {
    const midLat = (startCoords[0] + endCoords[0]) / 2;
    const midLng = (startCoords[1] + endCoords[1]) / 2;
    return [midLat, midLng];
  };

  const handleDayChange = (event) => {
    const dayKey = event.target.value;
    setSelectedDay(dayKey);

    if (map && dayKey) {
      const dayData = appalachianTrailDetails.find((day) => day[dayKey]);
      if (dayData && dayData[dayKey]) {
        const { startingCoordinates, endingCoordinates } = dayData[dayKey];
        const midpoint = calculateMidpoint(
          startingCoordinates,
          endingCoordinates,
        );

        map.flyTo(midpoint, 12, {
          animate: true,
          duration: 1.5,
        });
      }
    }
  };

  const getFilteredDays = () => {
    if (!selectedState) {
      return appalachianTrailDetails.slice(0, 193);
    }

    return appalachianTrailDetails.slice(0, 193).filter((dayObj) => {
      const dayKey = Object.keys(dayObj)[0];
      const dayData = dayObj[dayKey];

      if (dayData.state && dayData.state.includes(selectedState)) {
        return true;
      }

      return false;
    });
  };

  const getSelectedDayData = () => {
    if (!selectedDay) return null;
    const dayData = appalachianTrailDetails.find((day) => day[selectedDay]);
    return dayData ? dayData[selectedDay] : null;
  };

  const selectedDayData = getSelectedDayData();
  const filteredDays = getFilteredDays();

  return (
    <Box sx={{ height: "calc(100vh - 40px)" }}>
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              height: "100%",
            }}
          >
            <FormControl fullWidth>
              <InputLabel>Select State</InputLabel>
              <Select
                variant="outlined"
                value={selectedState}
                label="Select State"
                onChange={handleStateChange}
                sx={{ backgroundColor: "#e3f2fd" }}
              >
                {states.map((state) => (
                  <MenuItem key={state.name} value={state.name}>
                    {state.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Select Day</InputLabel>
              <Select
                variant="outlined"
                value={selectedDay}
                label="Select Day"
                onChange={handleDayChange}
                sx={{ backgroundColor: "#e8f5e8" }}
              >
                {filteredDays.map((dayObj, index) => {
                  const dayKey = Object.keys(dayObj)[0];
                  const dayData = dayObj[dayKey];
                  const date = new Date(dayData.date);
                  const formattedDate = date.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  }).replace(/(\d+),/, (match, day) => {
                    const suffix = day % 10 === 1 && day !== 11 ? 'st' :
                                  day % 10 === 2 && day !== 12 ? 'nd' :
                                  day % 10 === 3 && day !== 13 ? 'rd' : 'th';
                    return day + suffix + ',';
                  });
                  return (
                    <MenuItem key={dayKey} value={dayKey}>
                      {dayKey}: {formattedDate}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 9 }}>
          <Box
            sx={{ height: "100%", backgroundColor: "#000", borderRadius: 1 }}
          >
            <MapContainer
              center={[39.8283, -98.5795]}
              zoom={4}
              style={{ height: "100%", width: "100%" }}
              ref={setMap}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

              {selectedDayData && (
                <>
                  <Marker
                    position={selectedDayData.startingCoordinates}
                    icon={greenIcon}
                  >
                    <Popup>
                      <strong>Starting Location:</strong>
                      <br />
                      {selectedDayData.startingLocation}
                    </Popup>
                  </Marker>

                  <Marker
                    position={selectedDayData.endingCoordinates}
                    icon={redIcon}
                  >
                    <Popup>
                      <strong>Ending Location:</strong>
                      <br />
                      {selectedDayData.endingLocation}
                    </Popup>
                  </Marker>
                </>
              )}
            </MapContainer>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AppalachianTrail;
