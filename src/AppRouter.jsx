import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './Home';
import Results from './Results';
import BlastResults from './BlastResults';
import BatchResults from './BatchResults';

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/blast-results" element={<BlastResults />} />
        <Route path="/batch-results" element={<BatchResults />} />
      </Routes>
    </Router>
  );
}

export default AppRouter;
