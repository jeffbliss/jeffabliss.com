import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Quiz from "./components/Quiz";
import AppalachianTrailMap from "./components/AppalachianTrailMap";
import CopyAppTrailMap from "./components/AppalachianTrailMap.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/appalachiantrail" element={<CopyAppTrailMap />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/map" element={<AppalachianTrailMap />} />
      </Routes>
    </Router>
  );
}

export default App;
