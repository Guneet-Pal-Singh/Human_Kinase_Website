import fs from 'fs';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import KinaseDataset from './kinaseDataset.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ipdb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.resolve(__dirname, '../kinase_dataset_v27_updated_filtered.csv');

async function importKinaseDataset() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

        console.log('Reading kinase dataset CSV...');
        const results = [];
        let rowCount = 0;

        await new Promise((resolve, reject) => {
            fs.createReadStream(CSV_PATH)
                .pipe(csv())
                .on('data', (data) => {
                    results.push(data);
                    rowCount++;
                    if (rowCount % 1000 === 0) {
                        console.log(`Processed ${rowCount} rows...`);
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (results.length === 0) {
            console.log('No data found in kinase dataset CSV.');
        } else {
            console.log(`Clearing existing kinase dataset data...`);
            await KinaseDataset.deleteMany({});

            console.log(`Importing ${results.length} records in batches...`);
            const batchSize = 1000;
            for (let i = 0; i < results.length; i += batchSize) {
                const batch = results.slice(i, i + batchSize);
                await KinaseDataset.insertMany(batch);
                console.log(`Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(results.length / batchSize)}`);
            }

            console.log(`Kinase dataset imported successfully. Imported ${results.length} records.`);
        }

        await mongoose.disconnect();
        console.log('Import completed!');
    } catch (err) {
        console.error('Error importing kinase dataset:', err);
        process.exit(1);
    }
}

importKinaseDataset();
