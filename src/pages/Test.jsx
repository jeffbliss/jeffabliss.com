import React, { useState, useEffect } from "react";
import {
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  useTheme,
  Drawer,
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  PhotoCamera,
  Book,
  Place,
  Close,
  Map,
  LibraryBooks,
} from "@mui/icons-material";

export default function AppalachianTrailApp() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [selectedState, setSelectedState] = useState("Georgia");
  const [selectedDay, setSelectedDay] = useState("Day 3: April 3rd, 2014");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [photosDrawerOpen, setPhotosDrawerOpen] = useState(false);
  const [trailDrawerOpen, setTrailDrawerOpen] = useState(false);
  const [mobileNavValue, setMobileNavValue] = useState(0);

  const states = [
    "Georgia",
    "North Carolina",
    "Tennessee",
    "Virginia",
    "West Virginia",
    "Maryland",
    "Pennsylvania",
    "New Jersey",
    "New York",
    "Connecticut",
    "Massachusetts",
    "Vermont",
    "New Hampshire",
    "Maine",
  ];

  const days = [
    "Day 1: April 1st, 2014",
    "Day 2: April 2nd, 2014",
    "Day 3: April 3rd, 2014",
    "Day 4: April 4th, 2014",
    "Day 5: April 5th, 2014",
  ];

  const photos = [
    { id: 1, title: "Morning sunrise at shelter", location: "Mile 15.2" },
    { id: 2, title: "Creek crossing", location: "Mile 18.7" },
    { id: 3, title: "View from ridge", location: "Mile 21.3" },
    { id: 4, title: "Evening camp setup", location: "Mile 24.1" },
  ];

  const journalEntry = `Day 3 was challenging but rewarding. Started early at 6:30 AM from the shelter. The weather was perfect - cool morning with clear skies. 

Had a difficult creek crossing around mile 18 due to recent rains, but managed to keep my feet dry. The climb up to Blood Mountain was tough but the views were incredible.

Met some great fellow hikers including "Trail Magic" Mike who shared some snacks. Set up camp just past mile 24 and cooked dinner as the sun set. Feeling strong and optimistic about the journey ahead.

Total miles: 12.4
Weather: Clear, 45-68°F
Mood: Excellent`;

  const handleMobileNavChange = (event, newValue) => {
    setMobileNavValue(newValue);

    if (newValue === 0) {
      // Trail selection
      setTrailDrawerOpen(true);
      setPhotosDrawerOpen(false);
      setJournalOpen(false);
    } else if (newValue === 1) {
      // Photos
      setPhotosDrawerOpen(true);
      setTrailDrawerOpen(false);
      setJournalOpen(false);
    } else if (newValue === 2) {
      // Journal
      setJournalOpen(true);
      setPhotosDrawerOpen(false);
      setTrailDrawerOpen(false);
    }
  };

  // Trail Selection Component
  const TrailSelectionContent = ({ inDrawer = false }) => (
    <Paper sx={{ p: 3, m: inDrawer ? 0 : 2, elevation: inDrawer ? 0 : 2 }}>
      {inDrawer && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ color: "#2e7d32" }}>
            Trail Selection
          </Typography>
          <IconButton onClick={() => setTrailDrawerOpen(false)}>
            <Close />
          </IconButton>
        </Box>
      )}

      {!inDrawer && (
        <Typography variant="h6" gutterBottom sx={{ color: "#2e7d32", mb: 3 }}>
          Trail Selection
        </Typography>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>State</InputLabel>
        <Select
          value={selectedState}
          label="State"
          onChange={(e) => setSelectedState(e.target.value)}
        >
          {states.map((state) => (
            <MenuItem key={state} value={state}>
              {state}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Day</InputLabel>
        <Select
          value={selectedDay}
          label="Day"
          onChange={(e) => setSelectedDay(e.target.value)}
        >
          {days.map((day) => (
            <MenuItem key={day} value={day}>
              {day}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {!inDrawer && (
        <>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Book />}
            onClick={() => setJournalOpen(true)}
            sx={{ mb: 3, bgcolor: "#2196f3" }}
          >
            Journal Entry
          </Button>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            <Chip
              icon={<Place />}
              label="Start"
              sx={{ bgcolor: "#4caf50", color: "white" }}
              size="small"
            />
            <Chip
              icon={<Place />}
              label="End"
              sx={{ bgcolor: "#f44336", color: "white" }}
              size="small"
            />
            {selectedPhoto && (
              <Chip
                icon={<PhotoCamera />}
                label="Photo"
                sx={{ bgcolor: "#2196f3", color: "white" }}
                size="small"
                onDelete={() => setSelectedPhoto(null)}
              />
            )}
          </Box>
        </>
      )}
    </Paper>
  );

  // Photo Gallery Component
  const PhotoGalleryContent = ({ inDrawer = false }) => (
    <Paper sx={{ p: 3, m: inDrawer ? 0 : 2, elevation: inDrawer ? 0 : 2 }}>
      {inDrawer && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ color: "#2e7d32" }}>
            <PhotoCamera sx={{ mr: 1, verticalAlign: "middle" }} />
            Photos ({photos.length})
          </Typography>
          <IconButton onClick={() => setPhotosDrawerOpen(false)}>
            <Close />
          </IconButton>
        </Box>
      )}

      {!inDrawer && (
        <Typography variant="h6" gutterBottom sx={{ color: "#2e7d32", mb: 2 }}>
          <PhotoCamera sx={{ mr: 1, verticalAlign: "middle" }} />
          Photos ({photos.length})
        </Typography>
      )}

      <Grid container spacing={2}>
        {photos.map((photo) => (
          <Grid item xs={12} sm={6} md={inDrawer ? 12 : 6} key={photo.id}>
            <Card
              sx={{
                cursor: "pointer",
                border:
                  selectedPhoto?.id === photo.id
                    ? "2px solid #2196f3"
                    : "1px solid #e0e0e0",
                "&:hover": {
                  boxShadow: 4,
                  transform: "translateY(-2px)",
                  transition: "all 0.2s ease-in-out",
                },
                transition: "all 0.2s ease-in-out",
              }}
              onClick={() => {
                setSelectedPhoto(selectedPhoto?.id === photo.id ? null : photo);
                if (inDrawer) setPhotosDrawerOpen(false);
              }}
            >
              <CardMedia
                sx={{
                  height: inDrawer ? 120 : 80,
                  bgcolor:
                    selectedPhoto?.id === photo.id ? "#e3f2fd" : "#f5f5f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PhotoCamera
                  sx={{
                    fontSize: inDrawer ? 40 : 30,
                    color: selectedPhoto?.id === photo.id ? "#2196f3" : "#999",
                  }}
                />
              </CardMedia>
              <CardContent sx={{ p: 2 }}>
                <Typography
                  variant={inDrawer ? "body1" : "caption"}
                  display="block"
                  sx={{ fontWeight: 500, mb: 1 }}
                >
                  {photo.title}
                </Typography>
                <Typography
                  variant={inDrawer ? "body2" : "caption"}
                  color="text.secondary"
                >
                  {photo.location}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );

  // Desktop Layout
  if (!isMobile) {
    return (
      <Box sx={{ flexGrow: 1, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
        <Container maxWidth={false} sx={{ p: 0, height: "100vh" }}>
          <Box sx={{ display: "flex", height: "100%" }}>
            {/* Left Sidebar - 20% width */}
            <Box
              sx={{
                width: "20%",
                bgcolor: "white",
                borderRight: "1px solid #e0e0e0",
                overflow: "auto",
              }}
            >
              <TrailSelectionContent />
              <PhotoGalleryContent />
            </Box>

            {/* Main Map Area - 80% width */}
            <Box
              sx={{ width: "80%", display: "flex", flexDirection: "column" }}
            >
              <Paper
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "#e8f5e8",
                  margin: 2,
                  borderRadius: 2,
                  position: "relative",
                }}
              >
                <Box textAlign="center">
                  <Typography
                    variant="h2"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontWeight: 300 }}
                  >
                    [REACT LEAFLET MAP]
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    gutterBottom
                    sx={{ mb: 4 }}
                  >
                    Showing: {selectedState} - {selectedDay}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      flexWrap: "wrap",
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    <Chip
                      icon={<Place />}
                      label="Green Marker: Day Start"
                      sx={{ bgcolor: "#4caf50", color: "white" }}
                      size="medium"
                    />
                    <Chip
                      icon={<Place />}
                      label="Red Marker: Day End"
                      sx={{ bgcolor: "#f44336", color: "white" }}
                      size="medium"
                    />
                    {selectedPhoto && (
                      <Chip
                        icon={<PhotoCamera />}
                        label={`Blue Marker: ${selectedPhoto.title}`}
                        sx={{ bgcolor: "#2196f3", color: "white" }}
                        size="medium"
                      />
                    )}
                  </Box>

                  {selectedPhoto && (
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: "rgba(255,255,255,0.9)",
                        backdropFilter: "blur(10px)",
                        maxWidth: 400,
                        mx: "auto",
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 500, mb: 1 }}
                      >
                        Selected Photo: {selectedPhoto.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Location: {selectedPhoto.location}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </Paper>
            </Box>
          </Box>
        </Container>

        {/* Journal Dialog */}
        <Dialog
          open={journalOpen}
          onClose={() => setJournalOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 },
          }}
        >
          <DialogTitle>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h5" sx={{ color: "#2e7d32" }}>
                Journal Entry - {selectedDay}
              </Typography>
              <IconButton
                onClick={() => setJournalOpen(false)}
                sx={{ color: "#666" }}
              >
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography
              variant="body1"
              sx={{
                whiteSpace: "pre-line",
                lineHeight: 1.8,
                color: "#444",
                fontSize: "1.1rem",
              }}
            >
              {journalEntry}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => setJournalOpen(false)}
              variant="contained"
              sx={{ bgcolor: "#2e7d32" }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Mobile Layout
  return (
    <Box sx={{ flexGrow: 1, bgcolor: "#f5f5f5", minHeight: "100vh", pb: 7 }}>
      {/* Mobile App Bar */}
      <AppBar position="static" sx={{ bgcolor: "#2e7d32" }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Appalachian Trail
          </Typography>
          <Typography variant="body2">{selectedState}</Typography>
        </Toolbar>
      </AppBar>

      {/* Main Map Area */}
      <Box sx={{ height: "calc(100vh - 120px)", overflow: "hidden" }}>
        <Paper
          sx={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#e8f5e8",
            margin: 2,
            marginBottom: 0,
            borderRadius: 2,
          }}
        >
          <Box textAlign="center" sx={{ p: 2 }}>
            <Typography
              variant="h4"
              color="text.secondary"
              gutterBottom
              sx={{ fontWeight: 300 }}
            >
              [MAP VIEW]
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              gutterBottom
              sx={{ mb: 3 }}
            >
              {selectedDay}
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 1,
                mb: 2,
              }}
            >
              <Chip
                icon={<Place />}
                label="Start"
                sx={{ bgcolor: "#4caf50", color: "white" }}
                size="small"
              />
              <Chip
                icon={<Place />}
                label="End"
                sx={{ bgcolor: "#f44336", color: "white" }}
                size="small"
              />
              {selectedPhoto && (
                <Chip
                  icon={<PhotoCamera />}
                  label={selectedPhoto.title}
                  sx={{ bgcolor: "#2196f3", color: "white" }}
                  size="small"
                />
              )}
            </Box>

            {selectedPhoto && (
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(10px)",
                  maxWidth: 300,
                  mx: "auto",
                  mt: 2,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  {selectedPhoto.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedPhoto.location}
                </Typography>
              </Paper>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Bottom Navigation */}
      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000 }}
        elevation={3}
      >
        <BottomNavigation
          value={mobileNavValue}
          onChange={handleMobileNavChange}
          showLabels
        >
          <BottomNavigationAction label="Trail" icon={<Map />} />
          <BottomNavigationAction label="Photos" icon={<PhotoCamera />} />
          <BottomNavigationAction label="Journal" icon={<LibraryBooks />} />
        </BottomNavigation>
      </Paper>

      {/* Trail Selection Drawer */}
      <Drawer
        anchor="bottom"
        open={trailDrawerOpen}
        onClose={() => setTrailDrawerOpen(false)}
        PaperProps={{
          sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
        }}
      >
        <Box sx={{ p: 3, maxHeight: "50vh", overflow: "auto" }}>
          <TrailSelectionContent inDrawer={true} />
        </Box>
      </Drawer>

      {/* Photos Drawer */}
      <Drawer
        anchor="bottom"
        open={photosDrawerOpen}
        onClose={() => setPhotosDrawerOpen(false)}
        PaperProps={{
          sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
        }}
      >
        <Box sx={{ p: 3, maxHeight: "80vh", overflow: "auto" }}>
          <PhotoGalleryContent inDrawer={true} />
        </Box>
      </Drawer>

      {/* Journal Dialog - Full Screen on Mobile */}
      <Dialog
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
        fullScreen
        PaperProps={{
          sx: { bgcolor: "#f5f5f5" },
        }}
      >
        <AppBar sx={{ bgcolor: "#2e7d32" }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setJournalOpen(false)}
              aria-label="close"
            >
              <Close />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Journal Entry
            </Typography>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ mt: 2, bgcolor: "white", m: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ color: "#2e7d32", mb: 2 }}>
            {selectedDay}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              whiteSpace: "pre-line",
              lineHeight: 1.6,
              color: "#444",
            }}
          >
            {journalEntry}
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
