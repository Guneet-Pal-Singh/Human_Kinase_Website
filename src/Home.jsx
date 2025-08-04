


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import './Home.css';

function Home() {
  const [uniprotId, setUniprotId] = useState('');
  const [geneName, setGeneName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      // Serialize result data as query params for Results page
      const resultParams = new URLSearchParams();
      // Only add known fields to avoid leaking extra data
      const fields = [
        'uniprot_id', 'pdb', 'sequence', 'gene names (primary)', 'protein names',
        'kinase name', 'group', 'length', 'protein families', 'data_sources', 'EC_number',
        'All_Gene_Names'
      ];
      fields.forEach(f => {
        if (data[f]) resultParams.append(f, data[f]);
      });
      const url = `/results?${resultParams.toString()}`;
      window.open(url, '_blank');
    } catch (err) {
      setError('No data found for the provided input.');
    }
  };

  return (
    <>
      <Navbar />
      <div className="home-bg">
        <div className="home-container">
          <div className="home-header">
            Search
          </div>
          <form onSubmit={handleSearch} className="home-form">
            <div className="home-input-group">
              <input
                type="text"
                value={uniprotId}
                onChange={e => setUniprotId(e.target.value)}
                placeholder="Enter UniProt ID"
                className="home-input"
              />
              <input
                type="text"
                value={geneName}
                onChange={e => setGeneName(e.target.value)}
                placeholder="Enter Gene Name"
                className="home-input"
              />
            </div>
            <button type="submit" className="home-search-btn">
              Search
            </button>
            {error && <div className="home-error">{error}</div>}
          </form>
        </div>
        <footer className="home-footer">
        </footer>
      </div>
    </>
  );
}

export default Home;


