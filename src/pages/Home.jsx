import { Box, Grid, Typography } from "@mui/material";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Grid container spacing={2} sx={{ maxWidth: 800 }}>
        <Grid item xs={12} sm={12} md={6}>
          <Box
            component={Link}
            to="/nemacexamplesite"
            sx={{
              display: "block",
              p: 2,
              border: "1px solid #ccc",
              textDecoration: "none",
              "&:hover": { backgroundColor: "#f5f5f5" },
            }}
          >
            NEMAC Example Site
          </Box>
        </Grid>
        <Grid item xs={12} sm={12} md={6}>
          <Box
            component={Link}
            to="/nemacpresentation"
            sx={{
              display: "block",
              p: 2,
              border: "1px solid #ccc",
              textDecoration: "none",
              "&:hover": { backgroundColor: "#f5f5f5" },
            }}
          >
            NEMAC Presentation
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home;
