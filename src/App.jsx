import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import AppalachianTrail from "./components/AppalachianTrail.jsx";
import Quiz from "./components/Quiz";
import AppalachianTrailMap from "./components/AppalachianTrailMap";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/appalachiantrail" element={<AppalachianTrail />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/map" element={<AppalachianTrailMap />} />
      </Routes>
    </Router>
  );
}

export default App;
