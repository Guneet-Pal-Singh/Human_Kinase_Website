import React, { useState, useRef, useEffect } from 'react';
import './Home.css';


function Navbar() {
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar navbar-blue">
      <div className="navbar-content">
        <a href="/" className="nav-logo">KinaseDB</a>
        <div className="nav-links">
          <a href="/" className="nav-link">Home</a>
          <div className="dropdown" ref={dropdownRef}>
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
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
