

import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import './Home.css';

function parseQuery(queryString) {
  const params = new URLSearchParams(queryString);
  return {
    input: params.get('input') || '',
    type: params.get('type') || '',
  };
}

const columns = [
  { key: 'input', label: 'Input' },
  { key: 'gene_name', label: 'Gene Name' },
  { key: 'uniprot_id', label: 'UniProt ID' },
  { key: 'pdb', label: 'PDB' },
  { key: 'group', label: 'Group' },
  { key: 'seq_length', label: 'Seq Length' },
  { key: 'ec_number', label: 'EC Number' },
];

export default function BatchResults() {
  const location = useLocation();
  const { input, type } = parseQuery(location.search);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input) return;
    setLoading(true);
    setError('');
    fetch('http://localhost:5001/api/batch-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: input, type }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        // Map to array for table
        const arr = Object.entries(data.map || {}).map(([inp, v]) => ({ input: inp, ...v }));
        setResults(arr);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [input, type]);

  const handleDownload = async () => {
    const url = 'http://localhost:5001/api/download-batch-csv';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: input, type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to download CSV');
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'batch_results.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message || 'Failed to download CSV');
    }
  };

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
          <h1 className="title" style={{ color: '#1565a5', fontWeight: 800, letterSpacing: 1, marginBottom: 32, textAlign: 'center', fontSize: 32 }}>Batch Search Results</h1>
          <div style={{ marginBottom: 24, width: '100%' }}>
            <div className="sequence-label" style={{ color: '#2366a8', fontWeight: 700, marginBottom: 8, alignSelf: 'flex-start', fontSize: 18 }}><strong>Query Inputs:</strong></div>
            <div className="sequence sequence-bg" style={{ background: '#e3f0ff', color: '#1a3557', borderRadius: 6, padding: 10, fontFamily: 'monospace', fontSize: 14, marginBottom: 24, width: '100%' }}>{input}</div>
          </div>
          {loading && <div style={{ color: '#4b4fc4', fontWeight: 600, fontSize: 18 }}>Loading batch results...</div>}
          {error && <div style={{ color: 'red', fontWeight: 600 }}>{error}</div>}
          {!loading && !error && results.length > 0 && (
            <>
              <button onClick={handleDownload} style={{ marginBottom: 16, float: 'right', background: '#4c51bf', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 16, boxShadow: '0 2px 8px #e3eaf1' }}>
                Download CSV
              </button>
              <div style={{ clear: 'both' }} />
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
                    {columns.map((col, idx) => (
                      <th
                        key={col.key}
                        style={{
                          padding: '12px',
                          minWidth: col.key === 'input' || col.key === 'uniprot_id' ? '120px' : undefined,
                          borderTopLeftRadius: idx === 0 ? '18px' : undefined,
                          borderTopRightRadius: idx === columns.length - 1 ? '18px' : undefined,
                          fontWeight: 700,
                          fontSize: 16,
                          textAlign: 'center',
                          border: 'none'
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i} style={{background: i % 2 === 0 ? '#e3e9ff' : '#eef2fa'}}>
                      {columns.map(col => (
                        <td
                          key={col.key}
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            color: '#1a3557',
                            fontWeight: col.key === 'uniprot_id' || col.key === 'input' ? 700 : 500,
                            fontSize: 15,
                            border: 'none'
                          }}
                        >
                          {col.key === 'uniprot_id' && row[col.key] ? (
                            <a href={`https://www.uniprot.org/uniprotkb/${row[col.key]}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2366a8', cursor: 'pointer', fontWeight: 600 }}>{row[col.key]}</a>
                          ) : col.key === 'pdb' && row[col.key] ? (
                            <a href={`https://www.rcsb.org/3d-view/${row[col.key]}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2366a8', cursor: 'pointer', fontWeight: 600 }}>{row[col.key]}</a>
                          ) : (
                            row[col.key] || ''
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {!loading && !error && results.length === 0 && (
            <div style={{ color: '#4b4fc4', fontWeight: 600 }}>No batch results found.</div>
          )}
        </div>
      </div>
    </>
  );
}
