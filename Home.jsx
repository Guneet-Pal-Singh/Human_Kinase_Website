import React, { useState } from 'react';
import './src/App.css';

function Home() {
  const [uniprotId, setUniprotId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    try {
      const res = await fetch(`http://localhost:5001/api/search/${uniprotId}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('No data found for this UniProt ID.');
    }
  };

  return (
    <div className="main-bg">
      <div className="search-card">
        <h1 className="search-title">Human Kinase UniProt Search</h1>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={uniprotId}
            onChange={e => setUniprotId(e.target.value)}
            placeholder="Enter UniProt ID"
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>
        {error && <div className="error-msg">{error}</div>}
      </div>
      {result && (
        <div className="result-card" style={{maxWidth: '900px', width: '100%'}}>
          {/* Left: Dummy Image */}
          <div className="result-img-col">
            <img
              src="https://via.placeholder.com/180x180.png?text=Protein+Structure"
              alt="Protein Structure"
              className="result-img"
            />
            <div className="result-img-label">Structure Preview</div>
          </div>
          {/* Right: Info */}
          <div className="result-info-col">
            <h2 className="result-title">Result for {uniprotId}</h2>
            <div><strong>UniProt ID:</strong> {result.uniprot_id}</div>
            <div><strong>Protein Name:</strong> {result["protein names"]}</div>
            <div><strong>Gene Name:</strong> {result["gene names (primary)"]}</div>
            <div><strong>Kinase Name:</strong> {result["kinase name"]}</div>
            <div><strong>Group:</strong> {result.group}</div>
            <div><strong>Length:</strong> {result.length}</div>
            <div><strong>Protein Families:</strong> {result["protein families"]}</div>
            <div><strong>Description:</strong> {result.description}</div>
            <div><strong>PDB:</strong> {result.pdb}</div>
            <div><strong>Data Sources:</strong> {result.data_sources}</div>
            <details className="result-details">
              <summary>Show Sequence</summary>
              <div className="result-sequence">
                {result.sequence}
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
