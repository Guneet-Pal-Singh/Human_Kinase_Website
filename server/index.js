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

// Search API by UniProt ID
app.get('/api/search/:uniprot_id', async (req, res) => {
  try {
    let { uniprot_id } = req.params;
    uniprot_id = uniprot_id.trim();
    // Case-insensitive search for uniprot_id
    const result = await UsableData.findOne({
      uniprot_id: { $regex: `^${uniprot_id}$`, $options: 'i' }
    });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
