import React, { useState } from 'react';

function App() {
  const [uniprotId, setUniprotId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    try {
      const res = await fetch(`http://localhost:5001/api/search/${uniprot_id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('No data found for this UniProt ID.');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'Arial' }}>
      <h2>UniProt ID Search</h2>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={uniprotId}
          onChange={e => setUniprotId(e.target.value)}
          placeholder="Enter UniProt ID"
          style={{ padding: 8, width: 200 }}
        />
        <button type="submit" style={{ padding: 8, marginLeft: 8 }}>Search</button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 24 }}>
          <h3>Result</h3>
          <pre style={{ background: '#f4f4f4', padding: 16 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
