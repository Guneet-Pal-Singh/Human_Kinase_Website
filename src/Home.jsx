


import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from './Navbar';



function Home() {
  const [uniprotId, setUniprotId] = useState('');
  const [geneName, setGeneName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const resultRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    if (!uniprotId && !geneName) {
      setError('Please enter UniProt ID or Gene Name.');
      return;
    }
    try {
      const params = new URLSearchParams();
      if (uniprotId) params.append('uniprot_id', uniprotId);
      if (geneName) params.append('gene_name', geneName);
      const res = await fetch(`http://localhost:5001/api/search?${params.toString()}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      navigate('/results', { state: { result: data } });
    } catch (err) {
      setError('No data found for the provided input.');
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <h1 className="title">Human Kinase UniProt Search</h1>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={uniprotId}
            onChange={e => setUniprotId(e.target.value)}
            placeholder="Enter UniProt ID"
            className="search-input"
          />
          <input
            type="text"
            value={geneName}
            onChange={e => setGeneName(e.target.value)}
            placeholder="Enter Gene Name"
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>

        {error && <div className="error-msg">{error}</div>}

        {/* Results are now shown on a separate page */}
      </div>
    </>
  );
}

export default Home;


