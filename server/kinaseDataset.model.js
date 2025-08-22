import mongoose from 'mongoose';

const kinaseDatasetSchema = new mongoose.Schema({}, { strict: false });
// This allows all fields from the kinase dataset CSV to be stored as-is

export default mongoose.model('KinaseDataset', kinaseDatasetSchema, 'kinasedataset');
