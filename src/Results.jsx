import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Home.css';
import Navbar from './Navbar';



function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const resultRef = useRef(null);

  useEffect(() => {
    if (!result) {
      navigate('/');
      return;
    }
    // Scroll to result
    setTimeout(() => {
      if (resultRef.current) {
        resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    // NGL viewer logic
    function loadNGL() {
      const nglDiv = document.getElementById('nglViewer');
      if (nglDiv) nglDiv.innerHTML = '';
      if (window.nglStage) {
        window.nglStage.removeAllComponents();
        window.nglStage = null;
      }
      if (result && result.pdb) {
        window.nglStage = new window.NGL.Stage('nglViewer', { backgroundColor: 'white' });
        const pdbPath = `/pdb_files/${result.pdb}.pdb`;
        window.nglStage.loadFile(pdbPath, { defaultRepresentation: true })
          .then(() => window.nglStage.autoView())
          .catch(() => {
            if (nglDiv) nglDiv.innerHTML = '<div style="color:red;">PDB file not found.</div>';
          });
      } else {
        if (nglDiv) nglDiv.innerHTML = '<div style="color:red;">PDB not found.</div>';
      }
    }
    if (!window.NGL) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/ngl@2.0.0-dev.40/dist/ngl.js';
      script.async = true;
      script.onload = () => loadNGL();
      document.body.appendChild(script);
    } else {
      loadNGL();
    }
    return () => {
      if (window.nglStage) {
        window.nglStage.removeAllComponents();
      }
    };
  }, [result, navigate]);

  return (
    <>
    <Navbar />
    <div className="container">
      <h1 className="title">Human Kinase UniProt Search</h1>
      <div className="result-layout" ref={resultRef}>
        <div className="structure-box">
          <div id="nglViewer" className="ngl-viewer"></div>
          <div style={{ margin: '10px 0' }}>
            <a
              href={`/pdb_files/${result.pdb}.pdb`}
              download={`${result.pdb}.pdb`}
              style={{ color: '#4c51bf', cursor: 'pointer', fontWeight: 500 }}
            >
              Download Structure (PDB)
            </a>
          </div>
          <div className="sequence-label"><strong>Sequence:</strong></div>
          <div className="sequence sequence-bg">{result.sequence}</div>
        </div>
        <div className="info-box">
          <div className="uniprot-id-value">
            Gene Name: {result["gene names (primary)"]}
          </div>
          <div className="info-row"><strong className="info-label">Uniprot ID:</strong> <span className="info-value"><a href={`https://www.uniprot.org/uniprotkb/${result.uniprot_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4c51bf', cursor: 'pointer' }}>{result.uniprot_id}</a></span></div>
          <div className="info-row"><strong className="info-label">PDB:</strong> <span className="info-value"><a href={`https://www.rcsb.org/3d-view/${result.pdb}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4c51bf', cursor: 'pointer' }}>{result.pdb}</a></span></div>
          <div className="info-row"><strong className="info-label">Protein Name:</strong> <span className="info-value">{result["protein names"]}</span></div>
          <div className="info-row"><strong className="info-label">Kinase Name:</strong> <span className="info-value">{result["kinase name"]}</span></div>
          <div className="info-row"><strong className="info-label">Group:</strong> <span className="info-value">{result.group}</span></div>
          <div className="info-row"><strong className="info-label">Sequence Length:</strong> <span className="info-value">{result.length}</span></div>
          <div className="info-row"><strong className="info-label">Protein Families:</strong> <span className="info-value">{result["protein families"]}</span></div>
          <div className="info-row"><strong className="info-label">Data Sources:</strong> <span className="info-value">{result.data_sources}</span></div>
        </div>
      </div>
    </div>
    </>
  );
}

export default Results;
