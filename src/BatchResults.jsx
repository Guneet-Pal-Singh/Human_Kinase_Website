import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import './Home.css';
import './BatchResults.css'; // ✅ Added new CSS file import
import { base_url, extension_urls, batch_result, download_batch_csv } from "../config/urls";

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
    fetch(`${base_url}${extension_urls}${batch_result}`, {
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
    const url = `${base_url}${extension_urls}${download_batch_csv}`;;
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
      <div className="batch-container">
        <div className="batch-card">
          <h1 className="batch-title">Batch Search Results</h1>
          <div className="batch-query-container">
            <div className="batch-query-label"><strong>Query Inputs:</strong></div>
            <div className="batch-query-input">{input}</div>
          </div>
          {loading && <div className="batch-loading">Loading batch results...</div>}
          {error && <div className="batch-error">{error}</div>}
          {!loading && !error && results.length > 0 && (
            <>
              <button onClick={handleDownload} className="batch-download-btn">
                Download CSV
              </button>
              <div className="batch-clear" />
              <table className="batch-table">
                <thead>
                  <tr className="batch-thead-row">
                    {columns.map((col, idx) => (
                      <th
                        key={col.key}
                        // className={`batch-th ${idx === 0 ? 'batch-th-left' : ''} ${idx === columns.length - 1 ? 'batch-th-right' : ''}`}
                        // style={{ minWidth: col.key === 'input' || col.key === 'uniprot_id' ? '120px' : undefined }}
                        className={`batch-th ${idx === 0 ? 'batch-th-left' : ''} ${idx === columns.length - 1 ? 'batch-th-right' : ''}
                        ${col.key === 'input' || col.key === 'uniprot_id' ? 'wide-column' : ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i} className={`batch-row ${i % 2 === 0 ? 'batch-row-even' : 'batch-row-odd'}`}>
                      {columns.map(col => (
                        <td key={col.key} className={`batch-td ${col.key === 'uniprot_id' || col.key === 'input' ? 'batch-bold' : ''}`}>
                          {col.key === 'uniprot_id' && row[col.key] ? (
                            <a href={`https://www.uniprot.org/uniprotkb/${row[col.key]}`} target="_blank" rel="noopener noreferrer" className="batch-link">{row[col.key]}</a>
                          ) : col.key === 'pdb' && row[col.key] ? (
                            <a href={`https://www.rcsb.org/3d-view/${row[col.key]}`} target="_blank" rel="noopener noreferrer" className="batch-link">{row[col.key]}</a>
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
            <div className="batch-no-results">No batch results found.</div>
          )}
        </div>
      </div>
    </>
  );
}
