


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import './Home.css';
import { base_url, extension_urls, search_kinase } from '../config/urls';

function Home() {
  const [uniprotId, setUniprotId] = useState('');
  const [geneName, setGeneName] = useState('');
  const [blastSequence, setBlastSequence] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState('normal'); // 'normal', 'blast', 'batch'
  const navigate = useNavigate();
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
      const res = await fetch(`${base_url}${extension_urls}${search_kinase}?${params.toString()}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      // Serialize result data as query params for Results page
      const resultParams = new URLSearchParams();
      // Only add known fields to avoid leaking extra data
      const fields = [
        'uniprot_id', 'pdb', 'sequence', 'gene names (primary)', 'protein names',
        'kinase name', 'group', 'length', 'protein families', 'data_sources', 'EC_number',
        'All_Gene_Names', 'substrates', 'pdb_pocket','pocket_residues_y'
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
    <>
      <Navbar />
      <div className="home-bg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '40px' }}>
          <div className="home-container" style={{ maxWidth: 700, textAlign: 'center', marginBottom: 32, background: 'var(--container-bg)', borderRadius: 16, boxShadow: '0 6px 32px 0 rgba(0,0,0,0.10)', border: '1px solid #e3eaf1' }}>
            <h1 style={{ marginBottom: 16, color: 'var(--main-text)', fontWeight: 700 }}>Human Kinase Structural Database</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--main-text)', marginBottom: 0, fontWeight: 500 }}>
              Explore a comprehensive resource for human kinase structures, sequences, and annotations. Search by UniProt ID, gene name, or protein sequence (BLAST), or perform batch queries. Visualize, analyze, and download curated kinase data for research and discovery.
            </p>
          </div>
          {/* Search UI moved to Navbar. No search UI here. */}
        </div>
        <footer className="home-footer">
        </footer>
      </div>
    </>
  );
}

export default Home;


