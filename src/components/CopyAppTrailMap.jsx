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
import { Box, Typography } from "@mui/material";
import appalachianTrailDetails from "../data/AppalachianTrailDetails.js";
import Navbar from "./Navbar.jsx";
import MarkerClusterGroup from "react-leaflet-markercluster";

// New component to handle map clicks and display coordinates
const LocationMarker = ({ setClickedLatLng }) => {
  useMapEvents({
    click(e) {
      setClickedLatLng([e.latlng.lat.toFixed(4), e.latlng.lng.toFixed(4)]);
    },
  });
  return null;
};

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
        label: "Day 1: Amicalola Falls",
        dayNumber: 1,
        isStart: true,
      });
    }

    if (dayNumber === 193) {
      markers.push({
        position: day.endingCoordinates,
        label: "Day 193: Mt. Katahdin",
        dayNumber: 193,
        isEnd: true,
      });
    } else {
      markers.push({
        position: day.endingCoordinates,
        label: `Day ${dayNumber + 1}: ${day.endingLocation}`,
        dayNumber: dayNumber,
        location: day.endingLocation,
        date: day.date,
      });
    }
  });
  return markers;
};

const trailMarkers = processTrailMarkers();

const AppalachianTrailMap = () => {
  const mapRef = useRef(null);
  const [trailData, setTrailData] = useState(null);
  const [clickedLatLng, setClickedLatLng] = useState(null);

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
    <Box sx={{ height: "100vh", width: "100%" }}>
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
        <LocationMarker setClickedLatLng={setClickedLatLng} />

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

        {/* Marker Cluster Group */}
        <MarkerClusterGroup>
          {trailMarkers.map((marker, index) => (
            <Marker key={index} position={marker.position}>
              <Popup>
                <Box sx={{ minWidth: 200 }}>
                  {marker.isStart ? (
                    <>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        Day 1
                      </Typography>
                      <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                        Amicalola Falls
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        4/1/2014
                      </Typography>
                    </>
                  ) : marker.isEnd ? (
                    <>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                        Day 193
                      </Typography>
                      <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                        Mt. Katahdin
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        10/10/2014
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        Day {marker.dayNumber + 1}
                      </Typography>
                      <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                        {marker.location}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {marker.date}
                      </Typography>
                    </>
                  )}
                </Box>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {/* Display the clicked coordinates */}
        {clickedLatLng && (
          <Popup position={clickedLatLng}>
            {clickedLatLng[0]}, {clickedLatLng[1]}
          </Popup>
        )}
      </MapContainer>
    </Box>
  );
};

export default AppalachianTrailMap;
