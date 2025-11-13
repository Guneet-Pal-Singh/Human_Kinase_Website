import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import UsableData from './usableData.model.js';
import KinaseDataset from './kinaseDataset.model.js';
import fetch from 'node-fetch';

dotenv.config();

import { Parser as Json2csvParser } from 'json2csv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const filePath = path.join(__dirname, '../kinase_substrate_data_normalized.csv');
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

// Asset serving APIs

// Serve static assets directory
app.use('/api/assets', express.static(path.join(__dirname, '../assets')));

// Get list of available kinase plot files
app.get('/api/assets/kinase-plots', (req, res) => {
  try {
    const plotsDir = path.join(__dirname, '../assets/kinase_centric_plots_svg');
    fs.readdir(plotsDir, (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to read plots directory', details: err.message });
      }

      // Filter for SVG files and extract kinase names
      const svgFiles = files.filter(file => file.endsWith('_plot.svg'));
      const kinaseNames = svgFiles.map(file => file.replace('_plot.svg', ''));

      res.json({
        total: svgFiles.length,
        kinases: kinaseNames,
        files: svgFiles
      });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get list of available kinase expression files
app.get('/api/assets/kinase-expressions', (req, res) => {
  try {
    const expressionDir = path.join(__dirname, '../assets/kinase_svg_plots');
    fs.readdir(expressionDir, (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to read expression directory', details: err.message });
      }

      // Filter for SVG files and extract kinase names
      const svgFiles = files.filter(file => file.endsWith('_expression.svg'));
      const kinaseNames = svgFiles.map(file => file.replace('_expression.svg', ''));

      res.json({
        total: svgFiles.length,
        kinases: kinaseNames,
        files: svgFiles
      });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get specific kinase plot by name
app.get('/api/assets/kinase-plot/:kinaseName', (req, res) => {
  try {
    const { kinaseName } = req.params;
    const fileName = `${kinaseName}_plot.svg`;
    const filePath = path.join(__dirname, '../assets/kinase_centric_plots_svg', fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Plot not found for kinase: ${kinaseName}` });
    }

    // Set appropriate headers for SVG
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Send the file
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get specific kinase expression plot by name
app.get('/api/assets/kinase-expression/:kinaseName', (req, res) => {
  try {
    const { kinaseName } = req.params;
    const fileName = `${kinaseName}_expression.svg`;
    const filePath = path.join(__dirname, '../assets/kinase_svg_plots', fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Expression plot not found for kinase: ${kinaseName}` });
    }

    // Set appropriate headers for SVG
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Send the file
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Check if assets exist for a specific kinase
app.get('/api/assets/kinase-availability/:kinaseName', (req, res) => {
  try {
    const { kinaseName } = req.params;
    const plotFile = path.join(__dirname, '../assets/kinase_centric_plots_svg', `${kinaseName}_plot.svg`);
    const expressionFile = path.join(__dirname, '../assets/kinase_svg_plots', `${kinaseName}_expression.svg`);

    const availability = {
      kinase: kinaseName,
      plot_available: fs.existsSync(plotFile),
      expression_available: fs.existsSync(expressionFile),
      plot_url: fs.existsSync(plotFile) ? `/api/assets/kinase-plot/${kinaseName}` : null,
      expression_url: fs.existsSync(expressionFile) ? `/api/assets/kinase-expression/${kinaseName}` : null
    };

    res.json(availability);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get multiple kinase assets availability
app.post('/api/assets/kinase-batch-availability', (req, res) => {
  try {
    let { kinases } = req.body;

    // Handle both array and comma-separated string input
    if (typeof kinases === 'string') {
      kinases = kinases.split(',').map(k => k.trim()).filter(Boolean);
    }

    if (!Array.isArray(kinases) || kinases.length === 0) {
      return res.status(400).json({ error: 'Kinases array is required' });
    }

    const results = kinases.map(kinaseName => {
      const plotFile = path.join(__dirname, '../assets/kinase_centric_plots_svg', `${kinaseName}_plot.svg`);
      const expressionFile = path.join(__dirname, '../assets/kinase_svg_plots', `${kinaseName}_expression.svg`);

      return {
        kinase: kinaseName,
        plot_available: fs.existsSync(plotFile),
        expression_available: fs.existsSync(expressionFile),
        plot_url: fs.existsSync(plotFile) ? `/api/assets/kinase-plot/${kinaseName}` : null,
        expression_url: fs.existsSync(expressionFile) ? `/api/assets/kinase-expression/${kinaseName}` : null
      };
    });

    res.json({
      total: results.length,
      results: results
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Endpoint to download the CSV file

app.get('/api/download-csv', (req, res) => {
  const csvPath = path.join(__dirname, '../KinaseDB.csv');
  res.download(csvPath, 'KinaseDB.csv', (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to download CSV.' });
    }
  });
});


// API: List all unique Disease_Name values from Kinase_Diseases_Dataset.csv
app.get('/api/diseases', (req, res) => {
  try {
    const csvPath = path.join(__dirname, '../Kinase_Diseases_Dataset.csv');
    const diseases = new Set();
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const name = (row['Disease_Name'] || row['disease_name'] || '').trim();
        if (name) diseases.add(name);
      })
      .on('end', () => {
        const arr = Array.from(diseases).sort();
        res.json({ count: arr.length, diseases: arr });
      })
      .on('error', (err) => {
        res.status(500).json({ error: 'Failed to read CSV', details: err.message });
      });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// API: Lookup diseases by uniprot OR lookup uniprots by disease
// Query parameters:
//   ?uniprot=O00141    -> returns { uniprot, diseases: [...] }
//   ?disease=Name      -> returns { disease, uniprots: [...] }
app.get('/api/kinase-disease-lookup', (req, res) => {
  try {
    const { uniprot, disease } = req.query;
    if ((!uniprot || String(uniprot).trim() === '') && (!disease || String(disease).trim() === '')) {
      return res.status(400).json({ error: 'Provide either `uniprot` or `disease` query parameter.' });
    }

    const csvPath = path.join(__dirname, '../Kinase_Diseases_Dataset.csv');

    // Support comma-separated lists for UniProt only. For disease, treat the full string as a single name
    const uniprotInputs = uniprot ? String(uniprot).split(',').map(s => s.trim()).filter(Boolean) : [];
    const diseaseInputs = disease && String(disease).trim() !== '' ? [String(disease).trim()] : [];

    const resultsMap = {};

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const rowUniRaw = (row['UniProt'] || row['uniprot'] || '').trim();
        const rowEnsembl = (row['Ensembl'] || row['ensembl'] || '').trim();
        const rowDiseaseRaw = (row['Disease_Name'] || row['disease_name'] || '').trim();
        const rowDiseaseId = (row['Disease_ID'] || row['disease_id'] || '').trim();
        const rowDatasource = (row['Datasource_Scores'] || row['datasource_scores'] || row['Datasource_Scores'] || '').trim();
        const rowScore = (row['Score'] || row['score'] || '').trim();

        if (!rowUniRaw && !rowDiseaseRaw) return; // skip empty rows

        const outRow = {
          UniProt: rowUniRaw,
          Ensembl: rowEnsembl,
          Disease_ID: rowDiseaseId,
          Disease_Name: rowDiseaseRaw,
          Datasource_Scores: rowDatasource,
          Score: rowScore
        };

        // If uniprot lookup, collect full rows per requested uniprot(s)
        if (uniprotInputs.length > 0 && rowUniRaw) {
          uniprotInputs.forEach(inp => {
            if (inp && inp.toLowerCase() === rowUniRaw.toLowerCase()) {
              if (!resultsMap[inp]) resultsMap[inp] = [];
              resultsMap[inp].push(outRow);
            }
          });
        }

        // If disease lookup, collect full rows per requested disease(s)
        if (diseaseInputs.length > 0 && rowDiseaseRaw) {
          diseaseInputs.forEach(inp => {
            if (inp && inp.toLowerCase() === rowDiseaseRaw.toLowerCase()) {
              if (!resultsMap[inp]) resultsMap[inp] = [];
              resultsMap[inp].push(outRow);
            }
          });
        }
      })
      .on('end', () => {
        // Deduplicate rows per input (by JSON string) and return
        const formatted = {};
        Object.keys(resultsMap).forEach(k => {
          const seen = new Set();
          const uniq = [];
          (resultsMap[k] || []).forEach(r => {
            const key = JSON.stringify([r.UniProt, r.Ensembl, r.Disease_ID, r.Disease_Name, r.Datasource_Scores, r.Score]);
            if (!seen.has(key)) {
              seen.add(key);
              uniq.push(r);
            }
          });
          formatted[k] = uniq;
        });

        if (uniprotInputs.length > 0 && diseaseInputs.length === 0) {
          const out = uniprotInputs.map(u => ({ uniprot: u, rows: formatted[u] || [] }));
          return res.json({ results: out });
        }
        if (diseaseInputs.length > 0 && uniprotInputs.length === 0) {
          const out = diseaseInputs.map(d => ({ disease: d, rows: formatted[d] || [] }));
          return res.json({ results: out });
        }
        // If both provided, return both mappings keyed by input
        return res.json({ results: formatted });
      })
      .on('error', (err) => {
        res.status(500).json({ error: 'Failed to read CSV', details: err.message });
      });

  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});