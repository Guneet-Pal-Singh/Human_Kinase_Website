import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (result) {
      if (!window.NGL) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/ngl@2.0.0-dev.40/dist/ngl.js';
        script.async = true;
        script.onload = () => loadNGL();
        document.body.appendChild(script);
      } else {
        loadNGL();
      }
    }

    function loadNGL() {
      const nglDiv = document.getElementById('nglViewer');
      if (nglDiv) nglDiv.innerHTML = '';
      if (window.nglStage) {
        window.nglStage.removeAllComponents();
        window.nglStage = null;
      }
      window.nglStage = new window.NGL.Stage('nglViewer', { backgroundColor: 'white' });
      window.nglStage.loadFile('/7PUE.pdb', { defaultRepresentation: true });
      window.nglStage.autoView();
    }

    return () => {
      if (window.nglStage) {
        window.nglStage.removeAllComponents();
      }
    };
  }, [result]);

  return (
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
        <button type="submit" className="search-btn">Search</button>
      </form>

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <div className="result-layout">
          <div className="structure-box">
            <div id="nglViewer" className="ngl-viewer"></div>
            <div className="viewer-label">3D Structure</div>
            <details className="sequence-details">
              <summary>Show Sequence</summary>
              <div className="sequence">{result.sequence}</div>
            </details>
          </div>
          <div className="info-box">
            <h2 className="info-title">{result["protein names"]}</h2>
            <p><strong>UniProt ID:</strong> {result.uniprot_id}</p>
            <p><strong>Gene Name:</strong> {result["gene names (primary)"]}</p>
            <p><strong>Kinase Name:</strong> {result["kinase name"]}</p>
            <p><strong>Group:</strong> {result.group}</p>
            <p><strong>Length:</strong> {result.length}</p>
            <p><strong>Protein Families:</strong> {result["protein families"]}</p>
            <p><strong>Description:</strong> {result.description}</p>
            <p><strong>PDB:</strong> {result.pdb}</p>
            <p><strong>Data Sources:</strong> {result.data_sources}</p>

            {/* <details className="sequence-details">
              <summary>Show Sequence</summary>
              <div className="sequence">{result.sequence}</div>
            </details> */}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
