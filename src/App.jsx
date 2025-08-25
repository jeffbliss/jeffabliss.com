import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Home from "./pages/Home.jsx";
import NemacPresentation from "./pages/NemacPresentation.jsx";
import AppalachianTrail from "./pages/AppalachianTrail.jsx";
import Footer from "./components/Footer";
import { prompts } from "./prompts";
import { Box } from "@mui/material";
import Test from "./pages/Test.jsx";

function AppContent() {
  const location = useLocation();

  const getPagePrompts = () => {
    switch (location.pathname) {
      case "/":
        return prompts.Home;
      case "/nemacexamplesite":
        return prompts.NemacExampleSite || "";
      case "/nemacpresentation":
        return prompts.NemacPresentation || "";
      case "/appalachiantrail":
        return prompts.AppalachianTrail || "";
      default:
        return "No prompts available for this page";
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Box sx={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nemacpresentation" element={<NemacPresentation />} />
          <Route path="/appalachiantrail" element={<AppalachianTrail />} />
          <Route path="/test" element={<Test />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
