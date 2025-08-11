import { Typography, Box, Container } from "@mui/material";
import Navbar from "./Navbar";

const AppalachianTrail = () => {
  return (
    <>
      <Navbar />

      {/* Welcome Message */}
      <Container>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "80vh",
            textAlign: "center",
          }}
        >
          <Typography variant="h2" component="h1" gutterBottom>
            Welcome to the Appalachian Trail Presentation!
          </Typography>
          <Typography variant="h4" component="p" sx={{ mt: 2, mb: 2 }}>
            Made by Jeff Bliss and Claude Code
          </Typography>
          <Typography variant="h5" component="p">
            Credit goes to Greg Dobson for doing the thing to make this happen
          </Typography>
        </Box>
      </Container>
    </>
  );
};

export default AppalachianTrail;
