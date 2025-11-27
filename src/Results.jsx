// Results.js
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import './Home.css';
import Navbar from './Navbar';
import KinaseTree from './KinaseTree';
import KinasePlot from './KinasePlot';

// Helper for paginating arrays
function paginate(array, page_size, page_number) {
  return array.slice((page_number - 1) * page_size, page_number * page_size);
}

function parseResultFromSearchParams(searchParams) {
  // Only parse known fields for safety
  const fields = [
    'uniprot_id', 'pdb', 'sequence', 'gene names (primary)', 'protein names',
    'kinase name', 'group', 'length', 'protein families', 'data_sources', 'EC_number',
    'All_Gene_Names', 'substrates', 'pocket', 'pdb_pocket', 'pocket_residues_y', 'all_domains'
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
  const [substrateDetails, setSubstrateDetails] = useState(null);
  const [substratePage, setSubstratePage] = useState(1);
  const [substrateLoading, setSubstrateLoading] = useState(false);
  const [substrateError, setSubstrateError] = useState(null);
  const [showPocketHighlight, setShowPocketHighlight] = useState(true);

  // Modal state for expanded viewer
  const [showNGLModal, setShowNGLModal] = useState(false);

  // Prefer state, fallback to query params
  const result = useMemo(() => {
    if (location.state?.result) return location.state.result;
    const parsed = parseResultFromSearchParams(searchParams);
    return parsed;
  }, [location.state, searchParams]);

  // Data source links (unchanged)
  const dataSources = [
    { name: 'SugiyamaDB', url: 'https://esbl.nhlbi.nih.gov/Databases/Kinase_Logos/' },
    { name: 'KincoreDB', url: 'http://dunbrack.fccc.edu/kincore/download' },
    { name: 'HKPocketDB', url: 'http://zhaoserver.com.cn/HKPocket/HKPocket.html' },
    { name: 'phosformer', url: 'https://github.com/esbgkannan/phosformer/blob/main/data/reference_human_kinases.csv ' },
    { name: 'KinaseMD', url: 'https://bioinfo.uth.edu/kmd/download.html' },
    { name: 'Kinbase', url: 'http://kinase.com/web/current/kinbase/genes/SpeciesID/9606/' },
    { name: 'Kinhub', url: 'http://kinhub.org/kinases.html' },
    { name: 'KLIFS', url: 'https://klifs.net/api/kinase_names?species=HUMAN' },
    { name: 'Pkinfam', url: 'https://www.uniprot.org/docs/pkinfam.txt' },
    { name: 'Duntrack MSA', url: 'https://static-content.springer.com/esm/art%3A10.1038%2Fs41598-019-56499-4/MediaObjects/41598_2019_56499_MOESM4_ESM.txt' },
    { name: 'dunbrack_kincore', url: 'http://dunbrack3.fccc.edu/kincore/static/downloads/text-files/Human_Allgroups_Allspatials_Alldihedrals_All.tab' },
    { name: 'UniProt', url: 'https://www.uniprot.org/uniprotkb?query=%28reviewed%3Atrue%29+AND+%28organism_id%3A9606%29+AND+%28family%3A%22protein+kinase+superfamily%22%29' },
  ];

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

  // HELPER FUNCTION to correctly parse pocket strings
  function parsePocketToNGLSelection(pocketString) {
    if (!pocketString) return null;

    const rawData = pocketString.toString();
    // Split by comma, semicolon, or one or more spaces
    const parts = rawData.split(/[;,\s]+/).map(p => p.trim()).filter(Boolean);

    const nglSelections = parts.map(part => {
      if (part.includes(':')) {
        // Format is "Chain:Residue", e.g., "A:165"
        const [chain, res] = part.split(':');
        if (chain && res && /^\d+$/.test(res.trim())) {
          return `(:${chain.trim()} and ${res.trim()})`;
        }
      } else if (/^\d+(-\d+)?$/.test(part)) {
        // Format is "165" or "165-170"
        return part;
      }
      return null; // Ignore invalid parts
    }).filter(Boolean);

    if (nglSelections.length === 0) return null;
    return nglSelections.join(' or ');
  }

  // NGL viewer loading (small viewer)
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
        try { window.nglStage.removeAllComponents(); } catch (e) { /* ignore */ }
        window.nglStage = null;
      }

      if (result) {
        window.nglStage = new window.NGL.Stage('nglViewer', { backgroundColor: 'white' });
        const pdbPath = `/pdb_files/${result.uniprot_id}.pdb`;
        window.nglStage.loadFile(pdbPath, { defaultRepresentation: true })
          .then((component) => {
            // Highlight pocket residues if available
            if (result.pocket_residues_y && showPocketHighlight) {
              try {
                const selectionString = parsePocketToNGLSelection(result.pocket_residues_y);
                if (selectionString) {
                  component.addRepresentation('surface', {
                    sele: selectionString,
                    color: 'blue',
                    opacity: 0.5,
                    surfaceType: 'mesh',
                    wireframe: true
                  });
                }
              } catch (error) {
                console.warn('Error parsing pocket residues:', error);
              }
            }
            window.nglStage.autoView();
          })
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
        try { window.nglStage.removeAllComponents(); } catch (e) { /* ignore */ }
        window.nglStage = null;
      }
    };
  }, [result, navigate, showPocketHighlight]);

  // Effect to manage the large NGL viewer inside the modal
  useEffect(() => {
    // destroy when modal closed
    if (!showNGLModal) {
      if (window.nglStageLarge) {
        try { window.nglStageLarge.removeAllComponents(); } catch (e) { /* ignore */ }
        window.nglStageLarge = null;
      }
      const largeDiv = document.getElementById('nglViewerLarge');
      if (largeDiv) largeDiv.innerHTML = '';
      return;
    }

    if (!result) return;

    // create large viewer
    const modalDiv = document.getElementById('nglViewerLarge');
    if (!modalDiv) return; // modal not yet mounted

    modalDiv.innerHTML = '';
    if (window.nglStageLarge) {
      try { window.nglStageLarge.removeAllComponents(); } catch (e) { /* ignore */ }
      window.nglStageLarge = null;
    }

    window.nglStageLarge = new window.NGL.Stage('nglViewerLarge', { backgroundColor: 'white' });
    const pdbPath = `/pdb_files/${result.uniprot_id}.pdb`;
    window.nglStageLarge.loadFile(pdbPath, { defaultRepresentation: true })
      .then((component) => {
        if (result.pocket_residues_y && showPocketHighlight) {
          try {
            const selectionString = parsePocketToNGLSelection(result.pocket_residues_y);
            if (selectionString) {
              component.addRepresentation('surface', {
                sele: selectionString,
                color: 'blue',
                opacity: 0.5,
                surfaceType: 'mesh',
                wireframe: true
              });
            }
          } catch (error) {
            console.warn('Error parsing pocket residues for large viewer:', error);
          }
        }
        window.nglStageLarge.autoView();
      })
      .catch((e) => {
        modalDiv.innerHTML = '<div style="color:red;padding:16px;">PDB file not found for large viewer.</div>';
      });

    // cleanup when modal closes/unmounts
    return () => {
      if (window.nglStageLarge) {
        try { window.nglStageLarge.removeAllComponents(); } catch (e) { /* ignore */ }
        window.nglStageLarge = null;
      }
      const largeDiv2 = document.getElementById('nglViewerLarge');
      if (largeDiv2) largeDiv2.innerHTML = '';
    };
  }, [showNGLModal, result, showPocketHighlight]);

  return (
    <>
      <Navbar />
      <div className="container" style={{ background: 'linear-gradient(135deg, #e3f0ff 0%, #f8fbff 100%)', minHeight: '100vh', padding: 0 }}>
        <h1 className="title" style={{ color: '#1565a5', fontWeight: 800, letterSpacing: 1, marginTop: 32, marginBottom: 32, textAlign: 'center', fontSize: 32 }}>Human Kinase UniProt Search</h1>

        <div className="result-layout" ref={resultRef} style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'flex-start', background: 'white', borderRadius: 18, boxShadow: '0 6px 32px 0 rgba(35,102,168,0.10)', border: '1px solid #e3eaf1', padding: 36, maxWidth: 1300, margin: '0 auto' }}>
          <div className="structure-box" style={{ flex: 1, minWidth: 340, background: '#f4faff', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px 0 rgba(35,102,168,0.06)', display: 'flex', flexDirection: 'column', height: 520 }}>
            {/* Small viewer - EXACT original layout preserved */}
            <div style={{ position: 'relative', width: '100%', height: 320 }}>
              {/* Expand button overlay - does not change layout */}
              <button
                onClick={() => setShowNGLModal(true)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 10,
                  padding: '6px 10px',
                  fontSize: 13,
                  background: '#1565a5',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  zIndex: 20
                }}
                aria-label="Expand viewer"
              >
                Expand 🔍
              </button>

              <div
                id="nglViewer"
                className="ngl-viewer"
                style={{
                  background: '#e3f0ff',
                  borderRadius: 10,
                  width: '100%',
                  height: '100%',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'stretch',
                  justifyContent: 'stretch',
                  overflow: 'hidden'
                }}
              ></div>
            </div>

            {/* Controls Row - Pocket Highlighting and Download */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 16 }}>
              {result?.pocket_residues_y && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: '#e3f0ff', borderRadius: 6, flex: 1 }}>
                  <span style={{ color: '#1565a5', fontWeight: 600, fontSize: 14 }}>Pocket Highlighting:</span>
                  <button
                    onClick={() => {
                      const newState = !showPocketHighlight;
                      setShowPocketHighlight(newState);

                      // Force reload of NGL viewer with new settings (small & large)
                      setTimeout(() => {
                        // reload small viewer
                        if (window.NGL && result) {
                          try {
                            if (window.nglStage) {
                              window.nglStage.removeAllComponents();
                              window.nglStage = null;
                            }
                          } catch (e) { /* ignore */ }

                          const smallDiv = document.getElementById('nglViewer');
                          if (smallDiv) smallDiv.innerHTML = '';
                          window.nglStage = new window.NGL.Stage('nglViewer', { backgroundColor: 'white' });
                          const pdbPath = `/pdb_files/${result.uniprot_id}.pdb`;
                          window.nglStage.loadFile(pdbPath, { defaultRepresentation: true })
                            .then((component) => {
                              if (result.pocket_residues_y && newState) {
                                try {
                                  const selectionString = parsePocketToNGLSelection(result.pocket_residues_y);
                                  if (selectionString) {
                                    component.addRepresentation('surface', {
                                      sele: selectionString,
                                      color: 'blue',
                                      opacity: 0.5,
                                      surfaceType: 'mesh',
                                      wireframe: true
                                    });
                                  }
                                } catch (error) { console.warn('Error parsing pocket residues:', error); }
                              }
                              window.nglStage.autoView();
                            })
                            .catch(console.error);
                        }

                        // reload large viewer if open
                        if (showNGLModal && window.NGL) {
                          const modalDiv = document.getElementById('nglViewerLarge');
                          if (modalDiv) modalDiv.innerHTML = '';
                          if (window.nglStageLarge) {
                            try { window.nglStageLarge.removeAllComponents(); } catch (e) { /* ignore */ }
                            window.nglStageLarge = null;
                          }
                          window.nglStageLarge = new window.NGL.Stage('nglViewerLarge', { backgroundColor: 'white' });
                          const pdbPath = `/pdb_files/${result.uniprot_id}.pdb`;
                          window.nglStageLarge.loadFile(pdbPath, { defaultRepresentation: true })
                            .then((component) => {
                              if (result.pocket_residues_y && newState) {
                                try {
                                  const selectionString = parsePocketToNGLSelection(result.pocket_residues_y);
                                  if (selectionString) {
                                    component.addRepresentation('surface', {
                                      sele: selectionString,
                                      color: 'blue',
                                      opacity: 0.5,
                                      surfaceType: 'mesh',
                                      wireframe: true
                                    });
                                  }
                                } catch (error) { console.warn('Error parsing pocket residues for large viewer:', error); }
                              }
                              window.nglStageLarge.autoView();
                            })
                            .catch(console.error);
                        }
                      }, 100);
                    }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 4,
                      border: 'none',
                      background: showPocketHighlight ? '#2366a8' : '#ccc',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    {showPocketHighlight ? 'ON' : 'OFF'}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <a
                  href={`/pdb_files/${result.uniprot_id}.pdb`}
                  download={`${result.uniprot_id}.pdb`}
                  style={{ color: '#2366a8', cursor: 'pointer', fontWeight: 600, fontSize: 16, textDecoration: 'none' }}
                >
                  📁 Download PDB
                </a>
              </div>
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

            <div className="info-row">
              <strong className="info-label" style={{ color: '#1565a5' }}>Pocket Sequence:</strong>
              <span className="info-value" style={{ color: '#1a3557', fontFamily: 'monospace', display: 'block', whiteSpace: 'pre-wrap', lineHeight: 1.6, textAlign: 'center' }}>{result.pdb_pocket || 'Not available'}</span>
            </div>

            <div className="info-row">
              <strong className="info-label" style={{ color: '#1565a5' }}>All Domains:</strong>
              <span className="info-value" style={{ color: '#1a3557', fontFamily: 'monospace', display: 'block', whiteSpace: 'pre-wrap', lineHeight: 1.6, textAlign: 'center' }}>
                {(() => {
                  if (!result.all_domains || result.all_domains === '-') return 'Not available';
                  const domainsText = result.all_domains.toString();
                  let normalizedText = domainsText.replace(/Protein\s*[\r\n]+\s*kinase/gi, 'Protein kinase');
                  normalizedText = normalizedText.replace(/;/g, ';\n');
                  return normalizedText;
                })()}
              </span>
            </div>

            <div className="info-row"><strong className="info-label" style={{ color: '#1565a5' }}>Data Sources:</strong>
              <span className="info-value" style={{ color: '#1a3557' }}>
                {(() => {
                  if (!result.data_sources) return 'Not available';
                  const raw = Array.isArray(result.data_sources) ? result.data_sources : String(result.data_sources);
                  const parts = raw.split(/[;,]+/).map(s => s.trim()).filter(Boolean);
                  if (parts.length === 0) return 'Not available';
                  const normalize = s => String(s || '').replace(/[_\W]+/g, ' ').trim().toLowerCase();
                  return (
                    <>
                      {parts.map((p, i) => {
                        const n = normalize(p);
                        const found = dataSources.find(ds => {
                          const nName = normalize(ds.name);
                          return nName === n || nName.includes(n) || n.includes(nName);
                        });
                        const looksLikeUrl = /^(https?:)?\/\//i.test(p);
                        if (found) {
                          return (
                            <span key={p + i}>
                              <a href={found.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2366a8', cursor: 'pointer', fontWeight: 600 }}>{found.name}</a>
                              {i < parts.length - 1 ? '; ' : ''}
                            </span>
                          );
                        }
                        if (looksLikeUrl) {
                          return (
                            <span key={p + i}>
                              <a href={p} target="_blank" rel="noopener noreferrer" style={{ color: '#2366a8', cursor: 'pointer', fontWeight: 600 }}>{p}</a>
                              {i < parts.length - 1 ? '; ' : ''}
                            </span>
                          );
                        }
                        return <span key={p + i}>{p}{i < parts.length - 1 ? '; ' : ''}</span>;
                      })}
                    </>
                  );
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Substrate Details Table (unchanged) */}
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
                  {paginate(Object.entries(substrateDetails), 5, substratePage).map(([substrate, detailArray], groupIdx) => {
                    // detailArray is an array (possibly empty) of matching row objects
                    const rows = Array.isArray(detailArray) ? detailArray : [];
                    if (rows.length === 0) {
                      return (
                        <tr key={substrate} style={{ background: groupIdx % 2 === 0 ? '#f8fbff' : 'white' }}>
                          <td style={{ padding: 8, border: '1px solid #e3eaf1', fontWeight: 600 }}>
                            <a
                              href={`https://www.uniprot.org/uniprotkb/${substrate}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2366a8', cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}
                              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                            >
                              {substrate}
                            </a>
                          </td>
                          <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>Not available</td>
                          <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>Not available</td>
                          <td style={{ padding: 8, border: '1px solid #e3eafff', fontFamily: 'monospace' }}>Not available</td>
                          <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>Not available</td>
                          <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>Not available</td>
                          <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>Not available</td>
                        </tr>
                      );
                    }

                    return rows.map((row, rowIdx) => (
                      <tr key={`${substrate}-${rowIdx}-${row['residue'] || rowIdx}`} style={{ background: groupIdx % 2 === 0 ? '#f8fbff' : 'white' }}>
                        {rowIdx === 0 && (
                          <td rowSpan={rows.length} style={{ padding: 8, border: '1px solid #e3eaf1', fontWeight: 600, verticalAlign: 'middle' }}>
                            <a
                              href={`https://www.uniprot.org/uniprotkb/${substrate}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2366a8', cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}
                              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                            >
                              {substrate}
                            </a>
                          </td>
                        )}
                        <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>{row ? row["substrate|gene_name"] || 'Not available' : 'Not available'}</td>
                        <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>{row ? row["substrate|organism"] || 'Not available' : 'Not available'}</td>
                        <td style={{ padding: 8, border: '1px solid #e3eafff', fontFamily: 'monospace' }}>{row ? row["substrate|15AAmotif"] || 'Not available' : 'Not available'}</td>
                        <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>{row ? row["residue"] || 'Not available' : 'Not available'}</td>
                        <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>{row ? row["location_residue"] || 'Not available' : 'Not available'}</td>
                        <td style={{ padding: 8, border: '1px solid #e3eaf1' }}>{row ? row["Data|source"] || 'Not available' : 'Not available'}</td>
                      </tr>
                    ));
                  })}
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

          {/* KinaseTree visualization for kinase-disease associations */}
          {result && result.uniprot_id && (
            <div style={{ marginTop: 48 }}>
              <h2 style={{ color: '#1565a5', fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Kinase-Disease Associations</h2>
              <KinaseTree kinaseId={result.uniprot_id} />
            </div>
          )}

          {/* KinasePlot visualization for expression and centric plots */}
          {result && result["gene names (primary)"] && (
            <div style={{ marginTop: 48 }}>
              <h2 style={{ color: '#1565a5', fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Kinase Analysis Plots</h2>
              <KinasePlot geneName={result["gene names (primary)"]} /> 
            </div>
          )}

        </div>

        {/* LARGE NGL MODAL */}
        {showNGLModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.7)',
              zIndex: 9999,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onClick={() => setShowNGLModal(false)} // click outside closes
          >
            <div
              onClick={(e) => e.stopPropagation()} // prevent modal click from closing when clicking inside
              style={{
                width: '95%',
                maxWidth: 1200,
                height: '90%',
                background: 'white',
                borderRadius: 10,
                padding: 12,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
            >

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ flex: 1 }} />
                {/* pocket toggle inside modal */}
                {result?.pocket_residues_y && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#1565a5', fontWeight: 600 }}>Pocket:</span>
                    <button
                      onClick={() => setShowPocketHighlight(s => !s)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: showPocketHighlight ? '#2366a8' : '#ccc',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {showPocketHighlight ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )}
              </div>

              <div id="nglViewerLarge" style={{ width: '100%', height: '100%', borderRadius: 8, background: '#eef6ff' }}></div>
            </div>
          </div>
        )}

      </div>

      <style>
        {`
          /* ensure small viewer canvas keeps original sizing */
          #nglViewer, #nglViewer canvas {
            width: 100% !important;
            height: 100% !important;
            display: block;
            border-radius: 10px;
          }
          /* large viewer canvas */
          #nglViewerLarge canvas {
            width: 100% !important;
            height: 100% !important;
            display: block;
            border-radius: 8px;
          }
        `}
      </style>
    </>
  );
}

export default Results;
