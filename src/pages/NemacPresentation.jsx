import { Box, Typography, Button } from "@mui/material";

const NemacPresentation = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        textAlign: "center",
      }}
    >
      <Typography variant="h2" component="h1" sx={{ mb: 4 }}>
        Inspiration
      </Typography>
      <Button
        variant="contained"
        href="https://drive.google.com/file/d/1XaS__pata90QQH-lgHaiJdydx2zgfHbO/view?usp=drive_link"
        target="_blank"
        rel="noopener noreferrer"
      >
        Thanks Greg
      </Button>
    </Box>
  );
};

export default NemacPresentation;