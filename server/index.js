import fs from 'fs';
import csv from 'csv-parser';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import UsableData from './usableData.model.js';
import KinaseDataset from './kinaseDataset.model.js';
import fetch from 'node-fetch';

dotenv.config();

import { Parser as Json2csvParser } from 'json2csv';

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
    // Ensure substrates field is included
    const resultObj = result.toObject ? result.toObject() : result;
    res.json({
      ...resultObj,
      substrates: resultObj.substrates || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ...existing code...

// API: Get substrate details from kinase_substrate_data.csv
// POST /api/substrate-details
// Body: { substrates: ["substrate1", "substrate2", ...] }
// Returns: Object mapping each input substrate to an array of objects with specified columns
app.post('/api/substrate-details', async (req, res) => {
  try {
    let { substrates, kinase_id } = req.body;
    // Accept substrates as comma-separated string or array
    if (typeof substrates === 'string') {
      substrates = substrates.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(substrates) || substrates.length === 0 || !kinase_id) {
      return res.status(400).json({ error: 'A non-empty array or comma-separated string of substrates and a kinase_id are required.' });
    }
    const kinaseIdLc = kinase_id.toLowerCase();
    const details = {};
    substrates.forEach(s => { details[s] = null; });
    const inputLowerMap = {};
    substrates.forEach(s => { inputLowerMap[s.toLowerCase()] = s; });
    const filePath = path.join(__dirname, '../kinase_substrate_data_filled1.csv');
    const columns = [
      'substrate|uniprot_id',
      'substrate|gene_name',
      'substrate|organism',
      'substrate|15AAmotif',
      'Data|source',
      'residue',
      'location_residue'
    ];
    const found = new Set();
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const geneName = (row['substrate|gene_name'] || '').toLowerCase();
        const uniprotId = (row['substrate|uniprot_id'] || '').toLowerCase();
        const rowKinaseId = (row['kinase|uniprot_id'] || '').toLowerCase();
        Object.keys(inputLowerMap).forEach(inputLc => {
          if (!found.has(inputLc) && (inputLc === geneName || inputLc === uniprotId) && rowKinaseId === kinaseIdLc) {
            const entry = {};
            columns.forEach(col => { entry[col] = row[col] || ''; });
            details[inputLowerMap[inputLc]] = entry;
            found.add(inputLc);
          }
        });
      })
      .on('end', () => {
        res.json({ details });
      })
      .on('error', (err) => {
        res.status(500).json({ error: 'Failed to read CSV', details: err.message });
      });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Batch Search API
// Accepts: { inputs: "id1,id2,..." } and type: "uniprot" or "gene" (optional, default: both)
app.post('/api/batch-search', async (req, res) => {
  try {
    let { inputs, type } = req.body;
    if (!inputs || typeof inputs !== 'string') {
      return res.status(400).json({ error: 'Inputs (comma-separated) are required.' });
    }
    const inputArr = inputs.split(',').map(x => x.trim()).filter(Boolean);
    if (inputArr.length === 0) {
      return res.status(400).json({ error: 'No valid inputs provided.' });
    }
    // Build queries for all inputs
    const orQueries = [];
    inputArr.forEach(input => {
      if (!type || type === 'uniprot' || type === 'both') {
        orQueries.push({ uniprot_id: { $regex: `^${input}$`, $options: 'i' } });
      }
      if (!type || type === 'gene' || type === 'both') {
        orQueries.push({ All_Gene_Names: { $regex: `\\b${input}\\b`, $options: 'i' } });
      }
    });
    // Find all matches in one go
    const results = await UsableData.find({ $or: orQueries });
    // Map input to result
    const inputToResult = {};
    inputArr.forEach(input => {
      // Find first match for this input
      let match = results.find(r =>
        (r.uniprot_id && r.uniprot_id.toLowerCase() === input.toLowerCase()) ||
        (r.All_Gene_Names && r.All_Gene_Names.split(',').map(x => x.trim().toLowerCase()).includes(input.toLowerCase()))
      );
      if (match) {
        inputToResult[input] = {
          gene_name: match["gene names (primary)"] || match.All_Gene_Names || '',
          uniprot_id: match.uniprot_id || '',
          pdb: match.pdb || '',
          group: match.group || '',
          seq_length: match.length || match["Sequence Length"] || '',
          ec_number: match["EC_number"] || match["EC number"] || match.ec_number || '',
        };
      } else {
        inputToResult[input] = null;
      }
    });
    res.json({ map: inputToResult });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Batch Download API (CSV)
// Accepts: { inputs: "id1,id2,..." } and type: "uniprot" or "gene" (optional)
app.post('/api/download-batch-csv', async (req, res) => {
  try {
    let { inputs, type } = req.body;
    if (!inputs || typeof inputs !== 'string') {
      return res.status(400).json({ error: 'Inputs (comma-separated) are required.' });
    }
    const inputArr = inputs.split(',').map(x => x.trim()).filter(Boolean);
    if (inputArr.length === 0) {
      return res.status(400).json({ error: 'No valid inputs provided.' });
    }
    const orQueries = [];
    inputArr.forEach(input => {
      if (!type || type === 'uniprot' || type === 'both') {
        orQueries.push({ uniprot_id: { $regex: `^${input}$`, $options: 'i' } });
      }
      if (!type || type === 'gene' || type === 'both') {
        orQueries.push({ All_Gene_Names: { $regex: `\\b${input}\\b`, $options: 'i' } });
      }
    });
    const results = await UsableData.find({ $or: orQueries });
    // Only include the specified columns in the output
    const wantedFields = [
      'uniprot_id',
      'protein names',
      'length',
      'protein families',
      'sequence',
      'gene names (primary)',
      'kinase name',
      'group',
      'pocket',
      'data_sources',
      'pdb',
      'description',
      'EC_number',
      'All_Gene_Names',
      'substrates'
    ];
    const csvData = inputArr.map(input => {
      let match = results.find(r =>
        (r.uniprot_id && r.uniprot_id.toLowerCase() === input.toLowerCase()) ||
        (r.All_Gene_Names && r.All_Gene_Names.split(',').map(x => x.trim().toLowerCase()).includes(input.toLowerCase()))
      );
      if (match) {
        const obj = match.toObject();
        // Only pick the wanted fields
        const filtered = {};
        wantedFields.forEach(f => { filtered[f] = obj[f] || ''; });
        return filtered;
      } else {
        // If not found, return empty fields
        const empty = {};
        wantedFields.forEach(f => { empty[f] = ''; });
        return empty;
      }
    });
    const json2csv = new Json2csvParser({ fields: wantedFields });
    const csv = json2csv.parse(csvData);
    res.header('Content-Type', 'text/csv');
    res.attachment('batch_results.csv');
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
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
      substrates: 1,
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
        substrates: p.substrates,
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

// Kinase-Substrate Interaction Search API
app.get('/api/kinase-substrates', async (req, res) => {
  try {
    let { kinase_id, kinase_gene, substrate_id, substrate_gene, limit } = req.query;
    const query = {};

    // Build query based on parameters
    if (kinase_id && kinase_id.trim() !== '') {
      query["kinase|uniprot_id"] = { $regex: `^${kinase_id.trim()}$`, $options: 'i' };
    }
    if (kinase_gene && kinase_gene.trim() !== '') {
      query["kinase|gene_name"] = { $regex: kinase_gene.trim(), $options: 'i' };
    }
    if (substrate_id && substrate_id.trim() !== '') {
      query["substrate|uniprot_id"] = { $regex: `^${substrate_id.trim()}$`, $options: 'i' };
    }
    if (substrate_gene && substrate_gene.trim() !== '') {
      query["substrate|gene_name"] = { $regex: substrate_gene.trim(), $options: 'i' };
    }

    if (Object.keys(query).length === 0) {
      return res.status(400).json({
        error: 'At least one search parameter (kinase_id, kinase_gene, substrate_id, or substrate_gene) must be provided.'
      });
    }

    const limitNum = parseInt(limit) || 50;
    const results = await KinaseDataset.find(query).limit(limitNum);

    if (results.length === 0) {
      return res.status(404).json({ error: 'No kinase-substrate interactions found' });
    }

    // Format the response
    const formattedResults = results.map(r => {
      const obj = r.toObject ? r.toObject() : r;
      return {
        kinase: {
          uniprot_id: obj["kinase|uniprot_id"],
          gene_name: obj["kinase|gene_name"],
          organism: obj["kinase|organism"],
          family: obj["kinase|family"],
          domain_sequence: obj["kinase|domainsequence"],
          full_sequence: obj["kinase|fullsequence"]
        },
        substrate: {
          uniprot_id: obj["substrate|uniprot_id"],
          gene_name: obj["substrate|gene_name"],
          organism: obj["substrate|organism"],
          phosphorylation_site: obj["substrate|phosphorylationsite"],
          motif_15aa: obj["substrate|15AAmotif"],
          full_sequence: obj["substrate|fullsequence"]
        },
        interaction_details: {
          motif_merged: obj["Motif_Merged"],
          kinase_domain_description: obj["Kinase_Domain_Description"],
          kinase_domain_coordinates: obj["Kinase_Domain_Coordinates"],
          data_source: obj["Data|source"],
          updated_domain_name: obj["Updated_Domain_Name"]
        }
      };
    });

    res.json({
      total: results.length,
      interactions: formattedResults
    });
  } catch (err) {
    console.error('Kinase-substrate search error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get all substrates for a specific kinase
app.get('/api/kinase/:uniprot_id/substrates', async (req, res) => {
  try {
    const { uniprot_id } = req.params;
    const { limit } = req.query;

    const query = { "kinase|uniprot_id": { $regex: `^${uniprot_id}$`, $options: 'i' } };
    const limitNum = parseInt(limit) || 100;

    const results = await KinaseDataset.find(query).limit(limitNum);

    if (results.length === 0) {
      return res.status(404).json({ error: `No substrates found for kinase ${uniprot_id}` });
    }

    const substrates = results.map(r => {
      const obj = r.toObject ? r.toObject() : r;
      return {
        substrate_uniprot_id: obj["substrate|uniprot_id"],
        substrate_gene_name: obj["substrate|gene_name"],
        phosphorylation_site: obj["substrate|phosphorylationsite"],
        motif_15aa: obj["substrate|15AAmotif"],
        motif_merged: obj["Motif_Merged"],
        data_source: obj["Data|source"]
      };
    });

    res.json({
      kinase_uniprot_id: uniprot_id,
      substrate_count: substrates.length,
      substrates: substrates
    });
  } catch (err) {
    console.error('Get kinase substrates error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get all kinases that phosphorylate a specific substrate
app.get('/api/substrate/:uniprot_id/kinases', async (req, res) => {
  try {
    const { uniprot_id } = req.params;
    const { limit } = req.query;

    const query = { "substrate|uniprot_id": { $regex: `^${uniprot_id}$`, $options: 'i' } };
    const limitNum = parseInt(limit) || 100;

    const results = await KinaseDataset.find(query).limit(limitNum);

    if (results.length === 0) {
      return res.status(404).json({ error: `No kinases found for substrate ${uniprot_id}` });
    }

    const kinases = results.map(r => {
      const obj = r.toObject ? r.toObject() : r;
      return {
        kinase_uniprot_id: obj["kinase|uniprot_id"],
        kinase_gene_name: obj["kinase|gene_name"],
        kinase_family: obj["kinase|family"],
        phosphorylation_site: obj["substrate|phosphorylationsite"],
        motif_15aa: obj["substrate|15AAmotif"],
        data_source: obj["Data|source"]
      };
    });

    res.json({
      substrate_uniprot_id: uniprot_id,
      kinase_count: kinases.length,
      kinases: kinases
    });
  } catch (err) {
    console.error('Get substrate kinases error:', err);
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
  const csvPath = path.join(__dirname, '../DATA_TO_USE.csv');
  res.download(csvPath, 'DATA_TO_USE.csv', (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to download CSV.' });
    }
  });
});
