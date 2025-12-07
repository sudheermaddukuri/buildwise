const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PermitDocSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    title: { type: String, required: true },
    url: { type: String, required: true },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const PermitDocumentSetSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, index: true }, // e.g., Dallas
    state: { type: String, default: 'TX', index: true },
    zipCodes: [{ type: String, index: true }], // 5-digit zip strings
    projectType: { type: String, enum: ['new_home', 'pool'], required: true, index: true },
    documents: [PermitDocSchema],
  },
  { timestamps: true }
);

PermitDocumentSetSchema.index({ city: 1, projectType: 1 });
PermitDocumentSetSchema.index({ zipCodes: 1, projectType: 1 });

const PermitDocumentSet = mongoose.model('PermitDocumentSet', PermitDocumentSetSchema);

module.exports = { PermitDocumentSet };


