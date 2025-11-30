const mongoose = require('mongoose');

const AiUsageSchema = new mongoose.Schema(
  {
    prompt_tokens: { type: Number },
    completion_tokens: { type: Number },
    total_tokens: { type: Number },
    input_tokens: { type: Number },
    output_tokens: { type: Number },
  },
  { _id: false }
);

const AiLogSchema = new mongoose.Schema(
  {
    userEmail: { type: String, index: true },
    mode: { type: String, enum: ['url', 'files'], required: true },
    prompt: { type: String, default: '' },
    urls: [{ type: String }],
    model: { type: String },
    responseText: { type: String },
    usage: { type: mongoose.Schema.Types.Mixed }, // supports both Completions and Responses API usage shapes
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = { AiLog: mongoose.model('AiLog', AiLogSchema) };
