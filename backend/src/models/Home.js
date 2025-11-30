const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PhaseKeyEnum = ['preconstruction', 'exterior', 'interior'];

const PersonLiteSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    title: { type: String, required: true },
    url: { type: String, required: true },
    s3Key: { type: String },
    fileName: { type: String, default: '' },
    uploadedBy: {
      email: { type: String, default: '' },
      fullName: { type: String, default: '' },
    },
    pinnedTo: {
      type: {
        type: String,
        enum: ['trade', 'task', 'home'],
        default: 'home',
      },
      id: { type: String }, // tradeId or taskId
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TaskSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    title: { type: String, required: true },
    description: { type: String },
    phaseKey: { type: String, enum: PhaseKeyEnum, required: true },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'blocked', 'done'],
      default: 'todo',
    },
    completedBy: { type: String }, // email or name
    completedAt: { type: Date },
    dueDate: { type: Date },
    assignee: { type: String },
    checklist: [
      {
        _id: { type: String, default: uuidv4 },
        label: String,
        done: { type: Boolean, default: false },
      },
    ],
    comments: [
      {
        _id: { type: String, default: uuidv4 },
        author: String,
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false }
);

const TradeContactSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    company: { type: String, default: '' },
    fullName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const TradeSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true }, // e.g. Electrical, Plumbing, HVAC
    category: { type: String }, // free-form or controlled by UI
    phaseKeys: [{ type: String, enum: PhaseKeyEnum, required: true }],
    vendor: {
      name: String,
      contactName: String,
      phone: String,
      email: String,
    },
    contacts: [TradeContactSchema],
    contractSignedAt: { type: Date },
    totalPrice: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    additionalCosts: [
      {
        _id: { type: String, default: uuidv4 },
        label: String,
        amount: Number,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    qualityChecks: [
      {
        _id: { type: String, default: uuidv4 },
        phaseKey: { type: String, enum: PhaseKeyEnum, required: true },
        title: { type: String, required: true },
        notes: { type: String },
        accepted: { type: Boolean, default: false },
        acceptedBy: { type: String },
        acceptedAt: { type: Date },
      },
    ],
    invoices: [
      {
        _id: { type: String, default: uuidv4 },
        label: String,
        amount: Number,
        dueDate: { type: Date },
        paid: { type: Boolean, default: false },
        paidAt: { type: Date },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    tasks: [TaskSchema],
    notes: String,
    attachments: [DocumentSchema],
    changeLog: [
      {
        _id: { type: String, default: uuidv4 },
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        changedBy: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false }
);

const ScheduleSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    title: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    location: { type: String },
    bidId: { type: String },
    taskId: { type: String },
  },
  { _id: false }
);

const HomeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    clientName: { type: String },
    client: { type: PersonLiteSchema }, // supersedes clientName when onboarding is used
    monitors: [PersonLiteSchema],
    builder: { type: PersonLiteSchema },
    phases: [
      {
        key: { type: String, enum: PhaseKeyEnum, required: true },
        notes: String,
      },
    ],
    // Primary field going forward
    trades: [TradeSchema],
    // Back-compat field for older documents (read-only usage in controllers)
    bids: [TradeSchema],
    schedules: [ScheduleSchema],
    documents: [DocumentSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

const Home = mongoose.model('Home', HomeSchema);

module.exports = { Home, PhaseKeyEnum };


