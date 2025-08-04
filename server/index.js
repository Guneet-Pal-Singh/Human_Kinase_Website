import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import UsableData from './usableData.model.js';

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
