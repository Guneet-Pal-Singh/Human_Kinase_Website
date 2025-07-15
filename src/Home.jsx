import React, { useState } from 'react';
import './Home.css';

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

  React.useEffect(() => {
    // Dynamically load NGL Viewer only when result is present
    if (result) {
      // Check if NGL is already loaded
      if (!window.NGL) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/ngl@2.0.0-dev.40/dist/ngl.js';
        script.async = true;
        script.onload = () => {
          loadNGL();
        };
        document.body.appendChild(script);
      } else {
        loadNGL();
      }
    }
    function loadNGL() {
      // Remove previous stage if any
      if (window.nglStage) {
        window.nglStage.removeAllComponents();
      } else {
        window.nglStage = new window.NGL.Stage('nglViewer', { backgroundColor: 'white' });
      }
      // Load the local PDB file (7PUE.pdb in public folder)
      window.nglStage.loadFile('/7PUE.pdb', { defaultRepresentation: true });
      window.nglStage.autoView();
    }
    // Clean up on unmount
    return () => {
      if (window.nglStage) {
        window.nglStage.removeAllComponents();
      }
    };
  }, [result]);

  return (
    <div className="main-bg">
      <div className="search-card" style={{ marginTop: '88px' }}>
        <h1 className="search-title">Human Kinase UniProt Search</h1>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={uniprotId}
            onChange={e => setUniprotId(e.target.value)}
            placeholder="Enter UniProt ID"
            className="search-input black-input"
            style={{ color: 'black' }}
          />
          <button type="submit" className="search-btn">Search</button>
        </form>
        {error && <div className="error-msg">{error}</div>}
        <style>{`
          .black-input::placeholder {
            color: #222 !important;
            opacity: 1;
          }
        `}</style>
      </div>
      {result && (
        <div className="result-card" >
          {/* Left: 3D PDB Structure Viewer */}
          <div className="result-img-col" style={{ minWidth: 240, maxWidth: 280, height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div id="nglViewer" style={{ width: 210, height: 210, background: '#fff', borderRadius: 16, border: '1.5px solid #e3e8f0', boxShadow: '0 2px 12px rgba(49, 130, 206, 0.15)' }}></div>
            <div className="result-img-label">3D Structure</div>
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
