import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Home from "./components/Home";
import Quiz from "./components/Quiz";
import CopyAppTrailMap from "./components/AppalachianTrailMap.jsx";
import AppalachianTrail from "./components/AppalachianTrail.jsx";
import Dave from "./components/Dave";
import Footer from "./components/Footer";
import { prompts } from "./prompts";
import { Box } from "@mui/material";

function AppContent() {
  const location = useLocation();

  const getPagePrompts = () => {
    switch (location.pathname) {
      case "/":
        return prompts.Home;
      case "/appalachiantrail":
        return prompts.AppalachianTrail;
      case "/quiz":
        return prompts.Quiz;
      case "/map":
        return prompts.AppalachianTrailMap;
      case "/dave":
        return prompts.Dave;
      default:
        return "No prompts available for this page";
    }
  };

  return (
    <Box>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/appalachiantrail" element={<AppalachianTrail />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/map" element={<CopyAppTrailMap />} />
        <Route path="/dave" element={<Dave />} />
      </Routes>
      <Footer pagePrompts={getPagePrompts()} />
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
