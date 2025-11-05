import fs from 'fs';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UsableData from './usableData.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ipdb';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.resolve(__dirname, '../KinaseFinalData.csv');

async function importCSV() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_PATH)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
    if (results.length === 0) {
      console.log('No data found in CSV.');
    } else {
      await UsableData.deleteMany({});
      await UsableData.insertMany(results);
      console.log(`CSV data imported successfully. Imported ${results.length} records.`);
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error importing CSV:', err);
    process.exit(1);
  }
}

importCSV();
