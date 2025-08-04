import React, { useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import './Home.css';
import Navbar from './Navbar';
function parseResultFromSearchParams(searchParams) {
  // Only parse known fields for safety
  const fields = [
    'uniprot_id', 'pdb', 'sequence', 'gene names (primary)', 'protein names',
    'kinase name', 'group', 'length', 'protein families', 'data_sources', 'EC_number', 
    'All_Gene_Names'
  ];
  const result = {};
  fields.forEach(f => {
    if (searchParams.has(f)) {
      result[f] = searchParams.get(f);
    }
  });
  return Object.keys(result).length > 0 ? result : null;
}

function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resultRef = useRef(null);
  // Prefer state, fallback to query params
  const result = useMemo(() => {
    if (location.state?.result) return location.state.result;
    const parsed = parseResultFromSearchParams(searchParams);
    return parsed;
  }, [location.state, searchParams]);

  // // Debug print to check what result contains
  // React.useEffect(() => {
  //   console.log('Results page result object:', result);
  // }, [result]);

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
      <div className="container" style={{ background: 'linear-gradient(135deg, #e3f0ff 0%, #f8fbff 100%)', minHeight: '100vh', padding: 0 }}>
        <h1 className="title" style={{ color: '#1565a5', fontWeight: 800, letterSpacing: 1, marginTop: 32, marginBottom: 32, textAlign: 'center', fontSize: 32 }}>Human Kinase UniProt Search</h1>
        <div className="result-layout" ref={resultRef} style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'flex-start', background: 'white', borderRadius: 18, boxShadow: '0 6px 32px 0 rgba(35,102,168,0.10)', border: '1px solid #e3eaf1', padding: 36, maxWidth: 1100, margin: '0 auto' }}>
          <div className="structure-box" style={{ flex: 1, minWidth: 340, background: '#f4faff', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px 0 rgba(35,102,168,0.06)' }}>
            <div id="nglViewer" className="ngl-viewer" style={{ background: '#e3f0ff', borderRadius: 10, minHeight: 260, marginBottom: 12 }}></div>
            <div style={{ margin: '10px 0' }}>
              <a
                href={`/pdb_files/${result.pdb}.pdb`}
                download={`${result.pdb}.pdb`}
                style={{ color: '#2366a8', cursor: 'pointer', fontWeight: 600, fontSize: 16 }}
              >
                Download Structure (PDB)
              </a>
            </div>
            <div className="sequence-label" style={{ color: '#2366a8', fontWeight: 700, marginTop: 18 }}><strong>Sequence:</strong></div>
            <div className="sequence sequence-bg" style={{ background: '#e3f0ff', color: '#1a3557', borderRadius: 6, padding: 10, fontFamily: 'monospace', fontSize: 14, marginTop: 4 }}>{result.sequence}</div>
          </div>
          <div className="info-box" style={{ flex: 1, minWidth: 340, background: '#f4faff', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px 0 rgba(35,102,168,0.06)' }}>
            <div className="uniprot-id-value" style={{ color: '#1565a5', fontWeight: 700, fontSize: 18, marginBottom: 18 }}>
              Gene Name: {result["gene names (primary)"]}
            </div>
            <div className="info-row"><strong className="info-label" style={{ color: '#1565a5' }}>Uniprot ID:</strong> <span className="info-value"><a href={`https://www.uniprot.org/uniprotkb/${result.uniprot_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2366a8', cursor: 'pointer', fontWeight: 600 }}>{result.uniprot_id}</a></span></div>
            <div className="info-row"><strong className="info-label" style={{ color: '#1565a5' }}>PDB:</strong> <span className="info-value"><a href={`https://www.rcsb.org/3d-view/${result.pdb}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2366a8', cursor: 'pointer', fontWeight: 600 }}>{result.pdb}</a></span></div>
            <div className="info-row"><strong className="info-label" style={{ color: '#1565a5' }}>Protein Name:</strong> <span className="info-value" style={{ color: '#1a3557' }}>{result["protein names"]}</span></div>
            <div className="info-row"><strong className="info-label" style={{ color: '#1565a5' }}>Kinase Name:</strong> <span className="info-value" style={{ color: '#1a3557' }}>{result["kinase name"]}</span></div>
            <div className="info-row"><strong className="info-label" style={{ color: '#1565a5' }}>Group:</strong> <span className="info-value" style={{ color: '#1a3557' }}>{result.group}</span></div>
            <div className="info-row"><strong className="info-label" style={{ color: '#1565a5' }}>Sequence Length:</strong> <span className="info-value" style={{ color: '#1a3557' }}>{result.length}</span></div>
            <div className="info-row"><strong className="info-label" style={{ color: '#1565a5' }}>Protein Families:</strong> <span className="info-value" style={{ color: '#1a3557' }}>{result["protein families"]}</span></div>
            <div className="info-row"><strong className="info-label" style={{ color: '#1565a5' }}>Common Gene Names:</strong> <span className="info-value" style={{ color: '#1a3557' }}>{result.All_Gene_Names}</span></div>
            <div className="info-row"><strong className="info-label" style={{ color: '#1565a5' }}>EC Number:</strong> <span className="info-value" style={{ color: '#1a3557' }}>{result.EC_number}</span></div>
            <div className="info-row"><strong className="info-label" style={{ color: '#1565a5' }}>Data Sources:</strong> <span className="info-value" style={{ color: '#1a3557' }}>{result.data_sources}</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Results;
