import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  GeoJSON,
} from "react-leaflet";
import { useState, useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Box } from "@mui/material";
import ImageInfo from "./ImageInfo";
import { imageDetails } from "../data/imageDetails";
import Navbar from "./Navbar.jsx";

// Component to handle map events and update card position
const MapEventHandler = ({ selectedImage, setClickPosition }) => {
  const map = useMapEvents({
    move: () => {
      if (selectedImage) {
        const markerPoint = map.latLngToContainerPoint(
          selectedImage.coordinates,
        );
        setClickPosition({ x: markerPoint.x, y: markerPoint.y });
      }
    },
    zoom: () => {
      if (selectedImage) {
        const markerPoint = map.latLngToContainerPoint(
          selectedImage.coordinates,
        );
        setClickPosition({ x: markerPoint.x, y: markerPoint.y });
      }
    },
    zoomend: () => {
      if (selectedImage) {
        const markerPoint = map.latLngToContainerPoint(
          selectedImage.coordinates,
        );
        setClickPosition({ x: markerPoint.x, y: markerPoint.y });
      }
    },
    moveend: () => {
      if (selectedImage) {
        const markerPoint = map.latLngToContainerPoint(
          selectedImage.coordinates,
        );
        setClickPosition({ x: markerPoint.x, y: markerPoint.y });
      }
    },
  });

  return null;
};

const AppalachianTrailMap = () => {
  const mapRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [clickPosition, setClickPosition] = useState(null);
  const [trailData, setTrailData] = useState(null);
  const [statesData, setStatesData] = useState(null);

  useEffect(() => {
    // Load the trail centerline data
    fetch("/centerline.geojson")
      .then((response) => response.json())
      .then((data) => setTrailData(data))
      .catch((error) => console.error("Error loading trail data:", error));

    // Load US states with names and boundaries
    const statesUrl =
      "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_States_Generalized/FeatureServer/0/query?where=1%3D1&outFields=STATE_NAME&outSR=4326&f=geojson";
    fetch(statesUrl)
      .then((response) => response.json())
      .then((data) => setStatesData(data))
      .catch((error) => console.error("Error loading states data:", error));
  }, []);

  // Fix Leaflet default marker icon issue
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
        maxZoom={13}
      >
        {/* Base terrain layer with hillshade */}
        {/*<TileLayer*/}
        {/*  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'*/}
        {/*  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}"*/}
        {/*/>*/}

        {/* Enhanced hillshade overlay for mountain relief */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}"
          opacity={0.7}
        />

        {/* State boundaries overlay */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          opacity={1}
        />

        {/* Map event handler for card positioning */}
        <MapEventHandler
          selectedImage={selectedImage}
          setClickPosition={setClickPosition}
        />

        {/* Appalachian Trail centerline */}
        {trailData && (
          <GeoJSON
            data={trailData}
            style={{
              color: "#228B22",
              weight: 3,
              opacity: 0.8,
            }}
          />
        )}

        {/* Image markers */}
        {imageDetails.map((image) => (
          <Marker
            key={image.id}
            position={image.coordinates}
            eventHandlers={{
              click: (e) => {
                const map = mapRef.current;
                if (map) {
                  const clickPoint = map.latLngToContainerPoint(e.latlng);
                  setClickPosition({ x: clickPoint.x, y: clickPoint.y });
                  setSelectedImage(image);
                }
              },
            }}
          />
        ))}
      </MapContainer>

      {/* Image info card */}
      {selectedImage && clickPosition && (
        <ImageInfo
          imageData={selectedImage}
          clickPosition={clickPosition}
          onClose={() => {
            setSelectedImage(null);
            setClickPosition(null);
          }}
        />
      )}
    </Box>
  );
};

export default AppalachianTrailMap;
