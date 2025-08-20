import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import UsableData from './usableData.model.js';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ipdb';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Search API by UniProt ID and/or gene names (using All_Gene_Names)
app.get('/api/search', async (req, res) => {
  try {
    let { uniprot_id, gene_name } = req.query;
    const query = {};
    if (uniprot_id && uniprot_id.trim() !== '') {
      query.uniprot_id = { $regex: `^${uniprot_id.trim()}$`, $options: 'i' };
    }
    if (gene_name && gene_name.trim() !== '') {
      // Search in All_Gene_Names column which contains comma-separated gene names
      query["All_Gene_Names"] = { $regex: `\\b${gene_name.trim()}\\b`, $options: 'i' };
    }
    if (Object.keys(query).length === 0) {
      return res.status(400).json({ error: 'At least one search parameter (uniprot_id or gene_name) must be provided.' });
    }
    const result = await UsableData.findOne(query);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// BLAST-like Search API using our own database
app.post('/api/blast-search', async (req, res) => {
  const { sequence } = req.body;
  if (!sequence || typeof sequence !== 'string' || sequence.trim() === '') {
    return res.status(400).json({ error: 'Protein sequence is required.' });
  }
  try {
    // Fetch all sequences and relevant info from DB
    const allProteins = await UsableData.find({}, {
      sequence: 1,
      uniprot_id: 1,
      "protein names": 1,
      length: 1,
      "gene names (primary)": 1,
      "kinase name": 1,
      group: 1,
      pocket: 1,
      data_sources: 1,
      pdb: 1,
      description: 1,
      _id: 0
    });
    // Smith-Waterman local alignment
    function smithWaterman(seq1, seq2, matchScore = 2, mismatchScore = -1, gapPenalty = -2) {
      const m = seq1.length;
      const n = seq2.length;
      const scoreMatrix = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
      let maxScore = 0;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          const match = scoreMatrix[i - 1][j - 1] + (seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchScore);
          const deleteOp = scoreMatrix[i - 1][j] + gapPenalty;
          const insertOp = scoreMatrix[i][j - 1] + gapPenalty;
          scoreMatrix[i][j] = Math.max(0, match, deleteOp, insertOp);
          if (scoreMatrix[i][j] > maxScore) maxScore = scoreMatrix[i][j];
        }
      }
      return maxScore;
    }

    // E-value calculation (simplified)
    function calculateEValue(score, queryLength, dbSize, scaleFactor = 10) {
      // E = dbSize * queryLength * exp(-score / scaleFactor)
      return (dbSize * queryLength * Math.exp(-score / scaleFactor)).toExponential(2);
    }

    const dbSize = allProteins.length;
    const queryLength = sequence.length;

    // Score all proteins
    const matchScore = 2;
    const scored = allProteins.map(p => {
      const alignmentScore = smithWaterman(sequence, p.sequence, matchScore);
      const alignmentPercent = ((alignmentScore / (queryLength * matchScore)) * 100).toFixed(2);
      const eValue = calculateEValue(alignmentScore, queryLength, dbSize);
      return {
        uniprotId: p.uniprot_id,
        name: p["protein names"],
        length: p.length,
        geneName: p["gene names (primary)"],
        kinaseName: p["kinase name"],
        group: p.group,
        pocket: p.pocket,
        dataSources: p.data_sources,
        pdb: p.pdb,
        description: p.description,
        alignmentScore,
        alignmentPercent,
        eValue,
      };
    });
    // Sort by alignment score descending, take top 10
    const topMatches = scored.sort((a, b) => b.alignmentScore - a.alignmentScore).slice(0, 10);
    res.json({ matches: topMatches });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Endpoint to download the CSV file
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/api/download-csv', (req, res) => {
  const csvPath = path.join(__dirname, '../DATA_TO_USE_with_sequences.csv');
  res.download(csvPath, 'DATA_TO_USE_with_sequences.csv', (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to download CSV.' });
    }
  });
});
