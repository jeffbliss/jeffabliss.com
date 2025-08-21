import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import AppalachianTrail from "./components/AppalachianTrail.jsx";
import Quiz from "./components/Quiz";
import AppalachianTrailMap from "./components/AppalachianTrailMap";
import CopyAppTrailMap from "./components/CopyAppTrailMap.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/appalachiantrail" element={<AppalachianTrail />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/map" element={<AppalachianTrailMap />} />
        <Route path="/coordinates" element={<CopyAppTrailMap />} />
      </Routes>
    </Router>
  );
}

export default App;
