import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Results from './Results';
import BlastResults from './BlastResults';

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/blast-results" element={<BlastResults />} />
      </Routes>
    </Router>
  );
}

export default AppRouter;
