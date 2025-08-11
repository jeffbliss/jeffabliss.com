import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <AppBar position="static" sx={{ backgroundColor: "#228B22" }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AT Presentation
        </Typography>
        <Button color="inherit" component={Link} to="/appalachiantrail">
          Home
        </Button>
        <Button color="inherit" component={Link} to="/map">
          Trail Map
        </Button>
        <Button color="inherit" component={Link} to="/quiz">
          Quiz
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
