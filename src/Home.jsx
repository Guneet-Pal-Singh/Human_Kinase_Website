import './Home.css';


import React, { useState, useEffect, useRef } from 'react';
import './Home.css';

function Home() {
  const [uniprotId, setUniprotId] = useState('');
  const [geneName, setGeneName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Ref for result layout
  const resultRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
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
      setResult(data);
    } catch (err) {
      setError('No data found for the provided input.');
    }
  };

  useEffect(() => {
    if (result) {
      // Scroll to result
      setTimeout(() => {
        if (resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      // NGL viewer logic
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

      {result && (
        <div className="result-layout" ref={resultRef}>
          <div className="structure-box">
            <div id="nglViewer" className="ngl-viewer"></div>
            <div className="sequence-label"><strong>Sequence:</strong></div>
            <div className="sequence">{result.sequence}</div>
          </div>
          <div className="info-box">
            <div className="uniprot-id-value">
              Gene Name: {result["gene names (primary)"]} 
            </div>
            <div className="info-row"><strong className="info-label">Uniprot ID:</strong> <span className="info-value">{result.uniprot_id}</span></div>
            <div className="info-row"><strong className="info-label">Protein Name:</strong> <span className="info-value">{result["protein names"]}</span></div>
            
            <div className="info-row"><strong className="info-label">Kinase Name:</strong> <span className="info-value">{result["kinase name"]}</span></div>
            <div className="info-row"><strong className="info-label">Group:</strong> <span className="info-value">{result.group}</span></div>
            <div className="info-row"><strong className="info-label">Length:</strong> <span className="info-value">{result.length}</span></div>
            <div className="info-row"><strong className="info-label">Protein Families:</strong> <span className="info-value">{result["protein families"]}</span></div>
            <div className="info-row"><strong className="info-label">Description:</strong> <span className="info-value">{result.description}</span></div>
            <div className="info-row"><strong className="info-label">PDB:</strong> <span className="info-value">{result.pdb}</span></div>
            <div className="info-row"><strong className="info-label">Data Sources:</strong> <span className="info-value">{result.data_sources}</span></div>
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
