import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Quiz from "./components/Quiz";
import CopyAppTrailMap from "./components/AppalachianTrailMap.jsx";
import AppalachianTrail from "./components/AppalachianTrail.jsx";
import Footer from "./components/Footer";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/appalachiantrail" element={<AppalachianTrail />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/map" element={<CopyAppTrailMap />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
