import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import './Home.css';
import './BlastResults.css'; // ✅ Added new CSS file import
import { base_url, extension_urls, blast_search } from "../config/urls";

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
    fetch(`${base_url}${extension_urls}${blast_search}`, {
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
      <div className="blast-container">
        <div className="blast-card">
          <h1 className="blast-title">BLAST Search Results</h1>

          <div className="blast-sequence-label"><strong>Query Sequence:</strong></div>
          <div className="blast-sequence">{sequence}</div>

          {loading && <div className="blast-loading">Loading BLAST results...</div>}
          {error && <div className="blast-error">{error}</div>}

          {!loading && !error && results.length > 0 && (
            <table className="blast-table">
              <thead>
                <tr className="blast-thead-row">
                  <th className="blast-th-left">UniProt ID</th>
                  <th>Protein Name</th>
                  <th>Alignment %</th>
                  <th className="blast-th-right">E-value</th>
                  {/* Removed E-value column */}
                  {/* Removed Identity % column */}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={`blast-row ${i % 2 === 0 ? 'blast-row-even' : 'blast-row-odd'}`}>
                    <td className="blast-td blast-bold">
                      <a
                        href={`https://www.uniprot.org/uniprotkb/${r.uniprotId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="blast-link"
                      >
                        {r.uniprotId}
                      </a>
                    </td>
                    <td className="blast-td">{r.name}</td>
                    <td className="blast-td">{r.alignmentPercent}</td>
                    <td className="blast-td">{r.eValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="blast-no-results">No BLAST results found.</div>
          )}
        </div>
      </div>
    </>
  );
}

export default BlastResults;
