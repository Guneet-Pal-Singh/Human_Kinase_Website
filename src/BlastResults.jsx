

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import './Home.css';

function BlastResults() {
  const location = useLocation();
  // Try to get sequence from state (preferred), fallback to query param
  const sequence = location.state?.sequence || new URLSearchParams(location.search).get('sequence') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sequence) return;
    setLoading(true);
    setError('');
    fetch('http://localhost:5001/api/blast-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence }),
    })
      .then(async res => {
        let data;
        try {
          data = await res.json();
        } catch (e) {
          setError('Failed to parse response: ' + e.message);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError((data && data.error ? data.error : 'Unknown error') + (data && data.details ? ' - ' + data.details : ''));
          setResults([]);
        } else if (data.error) {
          setError(data.error + (data.details ? ' - ' + data.details : ''));
          setResults([]);
        } else {
          setResults(data.matches || data.results || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to fetch BLAST results: ' + err.message);
        setLoading(false);
      });
  }, [sequence]);

  return (
    <>
      <Navbar />
      <div className="container" style={{ background: 'linear-gradient(135deg, #e3f0ff 0%, #f8fbff 100%)', minHeight: '100vh', padding: 0 }}>
        <div style={{
          background: 'white',
          borderRadius: 18,
          boxShadow: '0 6px 32px 0 rgba(35,102,168,0.10)',
          border: '1px solid #e3eaf1',
          padding: 36,
          maxWidth: 900,
          margin: '48px auto 0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h1 className="title" style={{ color: '#1565a5', fontWeight: 800, letterSpacing: 1, marginBottom: 32, textAlign: 'center', fontSize: 32 }}>BLAST Search Results</h1>
          <div className="sequence-label" style={{ color: '#2366a8', fontWeight: 700, marginBottom: 8, alignSelf: 'flex-start' }}><strong>Query Sequence:</strong></div>
          <div className="sequence sequence-bg" style={{ background: '#e3f0ff', color: '#1a3557', borderRadius: 6, padding: 10, fontFamily: 'monospace', fontSize: 14, marginBottom: 24, width: '100%' }}>{sequence}</div>
          {loading && <div>Loading BLAST results...</div>}
          {error && <div style={{ color: 'red' }}>{error}</div>}
          {!loading && !error && results.length > 0 && (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '10px',
              background: '#f7f8fa',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(76, 81, 191, 0.08)'
            }}>
              <thead>
                <tr style={{background: '#4c51bf', color: '#fff'}}>
                  <th style={{padding: '12px', minWidth: '120px', borderTopLeftRadius: '18px'}}>UniProt ID</th>
                  <th style={{padding: '12px'}}>Protein Name</th>
                  <th style={{padding: '12px', minWidth: '120px'}}>Alignment %</th>
                  <th style={{padding: '12px', minWidth: '120px', borderTopRightRadius: '18px'}}>E-value</th>
                  {/* Removed E-value column */}
                  {/* Removed Identity % column */}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{background: i % 2 === 0 ? '#e3e9ff' : '#eef2fa'}}>
                    <td style={{padding: '12px', fontWeight: 700, color: '#4c51bf', textAlign: 'center'}}>
                      <a href={`https://www.uniprot.org/uniprotkb/${r.uniprotId}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2366a8', cursor: 'pointer', fontWeight: 600 }}>{r.uniprotId}</a>
                    </td>
                    <td style={{padding: '12px', textAlign: 'center', color: '#1a3557'}}>{r.name}</td>
                    <td style={{padding: '12px', textAlign: 'center', color: '#1a3557', minWidth: '120px'}}>{r.alignmentPercent}</td>
                    <td style={{padding: '12px', textAlign: 'center', color: '#1a3557', minWidth: '120px'}}>{r.eValue}</td>
                    {/* Removed E-value cell */}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !error && results.length === 0 && (
            <div>No BLAST results found.</div>
          )}
        </div>
      </div>
    </>
  );
}

export default BlastResults;
