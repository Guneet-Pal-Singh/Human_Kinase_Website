import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './Home';
import Results from './Results';
import BlastResults from './BlastResults';
import BatchResults from './BatchResults';
import TreeHierarchyView from './DiseaseDendroHeatmapPage';
import Kinase_Disease from './Kinase_Disease';
import KinaseTissue from './KinaseTissue';

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/blast-results" element={<BlastResults />} />
        <Route path="/batch-results" element={<BatchResults />} />
        <Route path="/kinase_disease" element={<Kinase_Disease />} />
        <Route path="/kinase_tissue" element={<KinaseTissue />} />
      </Routes>
    </Router>
  );
}

export default AppRouter;
