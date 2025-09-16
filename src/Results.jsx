import React, { useEffect, useRef, useMemo, useState } from 'react';
// Helper for paginating arrays
function paginate(array, page_size, page_number) {
  return array.slice((page_number - 1) * page_size, page_number * page_size);
}
import { useLocation, useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import './Home.css';
import Navbar from './Navbar';
function parseResultFromSearchParams(searchParams) {
  // Only parse known fields for safety
  const fields = [
    'uniprot_id', 'pdb', 'sequence', 'gene names (primary)', 'protein names',
    'kinase name', 'group', 'length', 'protein families', 'data_sources', 'EC_number',
    'All_Gene_Names', 'substrates'
  ];
  const result = {};
  fields.forEach(f => {
    if (searchParams.has(f)) {
      result[f] = searchParams.get(f);
    }
  });
  if (result.substrates == null) {
    console.log("nahi hai !!")
  } else {
    console.log(result.substrates)
  }
  return Object.keys(result).length > 0 ? result : null;
}

function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resultRef = useRef(null);
  const [substrateDetails, setSubstrateDetails] = useState(null);
  const [substratePage, setSubstratePage] = useState(1);
  const [substrateLoading, setSubstrateLoading] = useState(false);
  const [substrateError, setSubstrateError] = useState(null);
  // Prefer state, fallback to query params
  const result = useMemo(() => {
    if (location.state?.result) return location.state.result;
    const parsed = parseResultFromSearchParams(searchParams);
    return parsed;
  }, [location.state, searchParams]);
  // Fetch substrate details from backend
  useEffect(() => {
    if (!result || !result.substrates || !result.uniprot_id) return;
    let substrates = result.substrates;
    if (typeof substrates === 'string') {
      substrates = substrates.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(substrates) || substrates.length === 0) return;
    setSubstrateLoading(true);
    setSubstrateError(null);
    fetch('/api/substrate-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ substrates, kinase_id: result.uniprot_id })
    })
      .then(res => res.json())
      .then(data => {
        setSubstrateDetails(data.details || {});
        setSubstrateLoading(false);
      })
      .catch(e => {
        setSubstrateError('Failed to fetch substrate details');
        setSubstrateLoading(false);
      });
  }, [result]);

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
        <div className="result-layout" ref={resultRef} style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'flex-start', background: 'white', borderRadius: 18, boxShadow: '0 6px 32px 0 rgba(35,102,168,0.10)', border: '1px solid #e3eaf1', padding: 36, maxWidth: 1300, margin: '0 auto' }}>
          <div className="structure-box" style={{ flex: 1, minWidth: 340, background: '#f4faff', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px 0 rgba(35,102,168,0.06)', display: 'flex', flexDirection: 'column', height: 520 }}>
            <div
              id="nglViewer"
              className="ngl-viewer"
              style={{
                background: '#e3f0ff',
                borderRadius: 10,
                minHeight: 260,
                marginBottom: 12,
                width: '100%',
                height: 320,
                display: 'flex',
                alignItems: 'stretch',
                justifyContent: 'stretch',
                overflow: 'hidden'
              }}
            ></div>
            <div style={{ margin:'10px 0' }}>
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
           <div className="info-box" style={{ flex: 1, minWidth: 340, background: '#f4faff', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px 0 rgba(35,102,168,0.06)', height: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
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
        {/* Substrate Details Table */}
        <div className="result-layout" style={{ margin: '32px auto 0 auto', background: 'white', borderRadius: 14, boxShadow: '0 2px 8px 0 rgba(35,102,168,0.06)', border: '1px solid #e3eaf1', padding: 24, flexDirection: 'column', gap: 0, alignItems: 'stretch', minHeight: 'unset', height: 'unset', marginBottom: 64 }}>
          <h2 style={{ color: '#1565a5', fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Substrate Details</h2>
          {substrateLoading && <div style={{ color: '#2366a8', fontWeight: 600 }}>Loading substrate details...</div>}
          {substrateError && <div style={{ color: 'red', fontWeight: 600 }}>{substrateError}</div>}
          {substrateDetails && Object.keys(substrateDetails).length > 0 && (
            <div style={{ overflowX: 'auto', maxHeight: 320, minHeight: 80 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr style={{ background: '#e3f0ff' }}>
                    <th style={{ padding: 8, border: '1px solid #e3eaf1' }}>Substrate</th>
                    <th style={{ padding: 8, border: '1px solid #e3eaf1' }}>Gene Name</th>
                    <th style={{ padding: 8, border: '1px solid #e3eaf1' }}>Organism</th>
                    <th style={{ padding: 8, border: '1px solid #e3eaf1' }}>15AA Motif</th>
                    <th style={{ padding: 8, border: '1px solid #e3eaf1' }}>Residue</th>
                    <th style={{ padding: 8, border: '1px solid #e3eaf1' }}>Location</th>
                    <th style={{ padding: 8, border: '1px solid #e3eaf1' }}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {paginate(Object.entries(substrateDetails), 5, substratePage).map(([substrate, detail], idx) => (
                    <tr key={substrate} style={{ background: idx % 2 === 0 ? '#f8fbff' : 'white' }}>
                      <td style={{ padding: 8, border: '1px solid #e3eaf1', fontWeight: 600 }}>{substrate}</td>
                      <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>{detail ? detail["substrate|gene_name"] : '-'}</td>
                      <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>{detail ? detail["substrate|organism"] : '-'}</td>
                      <td style={{ padding: 8, border: '1px solid #e3eaf1', fontFamily: 'monospace' }}>{detail ? detail["substrate|15AAmotif"] : '-'}</td>
                      <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>{detail ? detail["residue"] : '-'}</td>
                      <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>{detail ? detail["location_residue"] : '-'}</td>
                      <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>{detail ? detail["Data|source"] : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination Controls */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 12 }}>
                <button onClick={() => setSubstratePage(p => Math.max(1, p - 1))} disabled={substratePage === 1} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #2366a8', background: substratePage === 1 ? '#e3eaf1' : '#2366a8', color: substratePage === 1 ? '#888' : 'white', fontWeight: 600, cursor: substratePage === 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
                <span style={{ fontWeight: 600, color: '#2366a8' }}>Page {substratePage} / {Math.ceil(Object.keys(substrateDetails).length / 5)}</span>
                <button onClick={() => setSubstratePage(p => Math.min(Math.ceil(Object.keys(substrateDetails).length / 5), p + 1))} disabled={substratePage === Math.ceil(Object.keys(substrateDetails).length / 5)} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #2366a8', background: substratePage === Math.ceil(Object.keys(substrateDetails).length / 5) ? '#e3eaf1' : '#2366a8', color: substratePage === Math.ceil(Object.keys(substrateDetails).length / 5) ? '#888' : 'white', fontWeight: 600, cursor: substratePage === Math.ceil(Object.keys(substrateDetails).length / 5) ? 'not-allowed' : 'pointer' }}>Next</button>
              </div>
            </div>
          )}
          {substrateDetails && Object.keys(substrateDetails).length === 0 && !substrateLoading && (
            <div style={{ color: '#2366a8', fontWeight: 600 }}>No substrate details found.</div>
          )}
        </div>
      </div>
      <style>
        {`
          #nglViewer canvas {
            width: 100% !important;
            height: 100% !important;
            display: block;
            border-radius: 10px;
          }
        `}
      </style>
    </>
  );
}

export default Results;
