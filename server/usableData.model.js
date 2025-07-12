import mongoose from 'mongoose';

const usableDataSchema = new mongoose.Schema({}, { strict: false });
// This allows all fields from CSV to be stored as-is

export default mongoose.model('UsableData', usableDataSchema);
