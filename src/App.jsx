import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Home from "./pages/Home.jsx";
import NemacPresentation from "./pages/NemacPresentation.jsx";
import AppalachianTrail from "./pages/AppalachianTrail.jsx";
import OldATMap from "./pages/OldATMap.jsx";
import Footer from "./components/Footer";
import { prompts } from "./prompts";
import { Box } from "@mui/material";
import Test from "./pages/Test.jsx";
import Slides from "./components/Slides.jsx";
import Claude_Code_Jeff from "./pages/Claude_Code_Jeff.jsx";
import Claude_Code_Nemac from "./pages/Claude_Code_Nemac.jsx";
import ClimateTyper from "./pages/ClimateTyper.jsx";
import NiceCheckXIV from "./pages/NiceCheckXIV.jsx";

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
      case "/ffxiv69":
        return prompts.NiceCheckXIV || "";
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
          <Route path="/oldATMap" element={<OldATMap />} />
          <Route path="/slides" element={<Slides />} />
          <Route path="/claudeJeff" element={<Claude_Code_Jeff />} />
          <Route path="/claudeNemac" element={<Claude_Code_Nemac />} />
          <Route path="/climateTyper" element={<ClimateTyper />} />
          <Route path="/ffxiv69" element={<NiceCheckXIV />} />
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
