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

// Search API by UniProt ID and/or gene names (primary)
app.get('/api/search', async (req, res) => {
  try {
    let { uniprot_id, gene_name } = req.query;
    const query = {};
    if (uniprot_id && uniprot_id.trim() !== '') {
      query.uniprot_id = { $regex: `^${uniprot_id.trim()}$`, $options: 'i' };
    }
    if (gene_name && gene_name.trim() !== '') {
      query["gene names (primary)"] = { $regex: `^${gene_name.trim()}$`, $options: 'i' };
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
