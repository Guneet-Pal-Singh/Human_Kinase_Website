import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import './navbar.css';

// Import the image from the public folder (Vite/React best practice is to use /[filename] for public assets)
const navbarBg = '/dna_navbar.jpg'; // Place the image in the public/ folder as dna_navbar.jpg


function Navbar() {
  // Prevent horizontal scroll on the whole page (in a React-safe way)
  useEffect(() => {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    return () => {
      document.documentElement.style.overflowX = '';
      document.body.style.overflowX = '';
    };
  }, []);
  const dataSources = [
    { name: 'SugiyamaDB', url: 'https://esbl.nhlbi.nih.gov/Databases/Kinase_Logos/' },
    { name: 'KincoreDB', url: 'http://dunbrack.fccc.edu/kincore/download' },
    { name: 'HKPocketDB', url: 'http://zhaoserver.com.cn/HKPocket/HKPocket.html' },
    { name: 'Phosphormer', url: 'https://github.com/esbgkannan/phosformer/blob/main/data/reference_human_kinases.csv ' },
    { name: 'KinaseMD', url: 'https://bioinfo.uth.edu/kmd/download.html' },
    { name: 'Kinbase', url: 'http://kinase.com/web/current/kinbase/genes/SpeciesID/9606/' },
    { name: 'Kinhub', url: 'http://kinhub.org/kinases.html' },
    { name: 'KLIFS', url: 'https://klifs.net/api/kinase_names?species=HUMAN' },
    { name: 'Pkinfam', url: 'https://www.uniprot.org/docs/pkinfam.txt' },
    { name: 'Duntrack MSA', url: 'https://static-content.springer.com/esm/art%3A10.1038%2Fs41598-019-56499-4/MediaObjects/41598_2019_56499_MOESM4_ESM.txt' },
    { name: 'Duntrack Kincore', url: 'http://dunbrack3.fccc.edu/kincore/static/downloads/text-files/Human_Allgroups_Allspatials_Alldihedrals_All.tab' },
    { name: 'UniProt', url: 'https://www.uniprot.org/uniprotkb?query=%28reviewed%3Atrue%29+AND+%28organism_id%3A9606%29+AND+%28family%3A%22protein+kinase+superfamily%22%29' },
    // Add more as needed
  ];
  // Download CSV handler
  const handleDownloadCSV = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/download-csv');
      if (!response.ok) throw new Error('Failed to download CSV');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DATA_TO_USE.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download CSV.');
    }
  };
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchType, setSearchType] = useState('normal');
  const [uniprotId, setUniprotId] = useState('');
  const [geneName, setGeneName] = useState('');
  const [blastSequence, setBlastSequence] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search handlers (copied from Home.jsx)
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
      const resultParams = new URLSearchParams();
      const fields = [
        'uniprot_id', 'pdb', 'sequence', 'gene names (primary)', 'protein names',
        'kinase name', 'group', 'length', 'protein families', 'data_sources', 'EC_number',
        'All_Gene_Names','substrates'
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
    <nav
      className="navbar navbar-blue navbar-bg-image"
      style={{ backgroundImage: `url(${navbarBg})` }}
    >

      <div className="navbar-content">
        <a href="/" className="nav-logo">KinaseDB</a>
        <div className="nav-links">
          <a href="/" className="nav-link">Home</a>
          <button className="nav-link" style={{background:'rgba(0,0,0,0.25)',border:'none',borderRadius:'4px',padding:'0.3em 0.8em',cursor:'pointer'}} onClick={handleDownloadCSV} onMouseOver={e => (e.target.style.background='#0a6cb5')} onMouseOut={e=>(e.target.style.background='rgba(0,0,0,0.25)')}>
            Download
          </button>
          {/* Data Sources Dropdown */}
          <div className="dropdown" ref={dropdownRef} style={{display: 'inline-block', marginRight: 12}}>
            <button
              className="dropbtn"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              Data Sources <span style={{fontSize: '0.7em'}}>▼</span>
            </button>
            <div className={`dropdown-content${dropdownOpen ? ' show' : ''}`}>
              {dataSources.map(ds => (
                <a key={ds.name} href={ds.url} target="_blank" rel="noopener noreferrer">{ds.name}</a>
              ))}
            </div>
          </div>
          {/* SEARCH Dropdown with forms */}
          <div className="dropdown" ref={searchDropdownRef} style={{display: 'inline-block'}}>
            <button className="dropbtn" onClick={() => setSearchDropdownOpen(open => !open)}>
              SEARCH <span style={{fontSize: '0.7em'}}>▼</span>
            </button>
            <div className={`dropdown-content${searchDropdownOpen ? ' show' : ''}`} style={{minWidth: 420, padding: 0}}>
              <div style={{display: 'flex', flexDirection: 'row', borderBottom: '1px solid #eee'}}>
                {[{type:'normal',label:'Normal Search'},{type:'blast',label:'BLAST Search'},{type:'batch',label:'Batch Search'}].map(opt => (
                  <button
                    key={opt.type}
                    style={{
                      flex: 1,
                      background: searchType===opt.type ? '#0a6cb5' : '#fff',
                      color: searchType===opt.type ? '#fff' : '#065a8e',
                      border: 'none',
                      padding: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s, color 0.2s'
                    }}
                    onMouseOver={e => {
                      if (searchType !== opt.type) {
                        e.target.style.background = '#0a6cb5';
                        e.target.style.color = '#fff';
                      }
                    }}
                    onMouseOut={e => {
                      if (searchType !== opt.type) {
                        e.target.style.background = '#fff';
                        e.target.style.color = '#065a8e';
                      }
                    }}
                    onClick={() => { setSearchType(opt.type); setError(''); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Normal Search */}
              {searchType === 'normal' && (
                <form onSubmit={handleSearch} className="home-form" style={{marginBottom: 0, boxShadow: 'none', padding: 24}}>
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
              )}
              {/* BLAST Search */}
              {searchType === 'blast' && (
                <form
                  className="home-form"
                  style={{marginBottom: 0, boxShadow: 'none', padding: 24}}
                  onSubmit={e => {
                    e.preventDefault();
                    if (!blastSequence) {
                      setError('Please enter a sequence for BLAST search.');
                      return;
                    }
                    setError('');
                    const url = `/blast-results?sequence=${encodeURIComponent(blastSequence)}`;
                    window.open(url, '_blank');
                  }}
                >
                  <div className="home-input-group">
                    <input
                      type="text"
                      value={blastSequence}
                      onChange={e => setBlastSequence(e.target.value)}
                      placeholder="Enter protein sequence (Plain Text)"
                      className="home-input"
                    />
                  </div>
                  <button type="submit" className="home-search-btn">
                    Run BLAST
                  </button>
                  {error && <div className="home-error">{error}</div>}
                </form>
              )}
              {/* Batch Search */}
              {searchType === 'batch' && (
                <form
                  className="home-form"
                  style={{marginBottom: 0, boxShadow: 'none', padding: 24}}
                  onSubmit={e => {
                    e.preventDefault();
                    if (!batchInput) {
                      setError('Please enter UniProt IDs or Gene Names (Comma Separated).');
                      return;
                    }
                    setError('');
                    const url = `/batch-results?input=${encodeURIComponent(batchInput)}`;
                    window.open(url, '_blank');
                  }}
                >
                  <div className="home-input-group">
                    <textarea
                      value={batchInput}
                      onChange={e => setBatchInput(e.target.value)}
                      placeholder="Enter UniProt IDs or Gene Names (comma or newline separated)"
                      className="home-input"
                      rows={4}
                      style={{resize: 'vertical'}}
                    />
                  </div>
                  <button type="submit" className="home-search-btn">
                    Run Batch Search
                  </button>
                  {error && <div className="home-error">{error}</div>}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
