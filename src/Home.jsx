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

      const res = await fetch(
        `${base_url}${extension_urls}${search_kinase}?${params.toString()}`
      );

      if (!res.ok) throw new Error('Not found');
      const data = await res.json();

      const resultParams = new URLSearchParams();

      const fields = [
        'uniprot_id', 'pdb', 'sequence', 'gene names (primary)', 'protein names',
        'kinase name', 'group', 'length', 'protein families', 'data_sources',
        'EC_number', 'All_Gene_Names', 'substrates', 'pdb_pocket',
        'pocket_residues_y', 'all_domains'
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

      <div
        className="home-bg"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 'clamp(120px, 18vh, 220px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            marginTop: 'clamp(20px, 3vh, 40px)',
          }}
        >
          <div
            className="home-container"
            style={{
              maxWidth: 'clamp(320px, 60vw, 700px)',
              textAlign: 'center',
              marginBottom: 'clamp(16px, 2.5vh, 32px)',
              background: 'var(--container-bg)',
              borderRadius: '16px',
              boxShadow: '0 6px 32px 0 rgba(0,0,0,0.10)',
              border: '1px solid #e3eaf1',
              padding: 'clamp(20px, 4vw, 32px) clamp(14px, 3vw, 24px)',
            }}
          >
            <h1
              style={{
                marginBottom: 'clamp(8px, 1.5vh, 16px)',
                color: 'var(--main-text)',
                fontWeight: 700,
                fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)',
              }}
            >
              Human Kinase Structural Database
            </h1>

            <p
              style={{
                fontSize: 'clamp(0.9rem, 1.4vw, 1.1rem)',
                color: 'var(--main-text)',
                marginBottom: 0,
                fontWeight: 500,
                lineHeight: '1.6',
              }}
            >
              Explore a comprehensive resource for human kinase structures,
              sequences, and annotations. Search by UniProt ID, gene name, or
              protein sequence (BLAST), or perform batch queries. Visualize,
              analyze, and download curated kinase data for research and
              discovery.
            </p>
          </div>
        </div>

        <footer className="home-footer"></footer>
      </div>
    </>
  );
}

export default Home;
