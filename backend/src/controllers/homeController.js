const Joi = require('joi');
const { Home, PhaseKeyEnum } = require('../models/Home');
const { v4: uuidv4 } = require('uuid');
const { Person } = require('../models/Person');
const { getTemplateById } = require('../templates');
const { Template } = require('../models/Template');
const { PermitDocumentSet } = require('../models/PermitDocumentSet');

function buildDefaultPhases() {
  return [
    { key: 'planning', notes: '' },
    { key: 'preconstruction', notes: '' },
    { key: 'exterior', notes: '' },
    { key: 'interior', notes: '' },
  ];
}

async function buildInitialTemplates(preferredTemplateId) {
  // Try DB template by id first if provided
  let bidsDef = [];
  if (preferredTemplateId) {
    const dbT = await Template.findById(preferredTemplateId);
    if (dbT && dbT.trades) {
      bidsDef = dbT.trades;
    }
  }
  if (!bidsDef.length) {
    const singleFamily = getTemplateById('single_family');
    bidsDef = (singleFamily?.getBids?.() || []);
  }
  const bids = bidsDef.map((b) => {
    const tasks = (b.tasks || []).map((t) => ({
      _id: uuidv4(),
      title: t.title,
      description: t.description || '',
      phaseKey: t.phaseKey,
      status: 'todo',
      dueDate: null,
      assignee: '',
      checklist: [],
      comments: [],
    }));
    const qualityChecks = (b.qualityChecks || []).map((c) => ({
      _id: uuidv4(),
      phase: undefined, // deprecated
      phaseKey: c.phaseKey,
      title: c.title,
      notes: c.notes || '',
      accepted: false,
      acceptedBy: '',
      acceptedAt: null,
    }));
    return {
      _id: uuidv4(),
      name: b.name,
      phaseKeys: b.phaseKeys,
      vendor: {},
      tasks,
      qualityChecks,
      totalPrice: 0,
      additionalCosts: [],
      notes: '',
      attachments: [],
    };
  });
  return { phases: buildDefaultPhases(), bids };
}

const homeCreateSchema = Joi.object({
  name: Joi.string().required(),
  address: Joi.string().allow('').optional(),
  clientName: Joi.string().allow('').optional(),
  withTemplates: Joi.boolean().optional().default(true),
  templateVersionId: Joi.string().allow('').optional(),
});

async function listHomes(_req, res) {
  const homes = await Home.find({}).sort({ updatedAt: -1 }).limit(100);
  return res.json(homes);
}

async function getHome(req, res) {
  const { homeId } = req.params;
  const home = await Home.findById(homeId);
  if (!home) {
    return res.status(404).json({ message: 'Home not found' });
  }
  return res.json(home);
}

async function createHome(req, res) {
  const { value, error } = homeCreateSchema.validate(req.body || {}, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }

  const { name, address, clientName, withTemplates, templateVersionId } = value;
  const base = {
    name,
    address,
    clientName,
    phases: buildDefaultPhases(),
    trades: [],
    schedules: [],
    documents: [],
  };
  if (withTemplates) {
    const templates = await buildInitialTemplates(templateVersionId);
    base.phases = templates.phases;
    // Seed into trades (primary field)
    base.trades = templates.bids;
  }
  // Attach city permit documents if address contains a known ZIP
  try {
    const zipMatch = typeof address === 'string' ? (address.match(/\b\d{5}\b/) || [])[0] : '';
    if (zipMatch) {
      // Gather both new home and pool permits
      const permitSets = await PermitDocumentSet.find({
        $or: [{ zipCodes: zipMatch }, { city: new RegExp('', 'i') }],
        projectType: { $in: ['new_home', 'pool'] },
      }).lean();
      for (const set of (permitSets || [])) {
        for (const doc of (set.documents || [])) {
          base.documents.push({
            _id: uuidv4(),
            title: doc.title,
            url: doc.url,
            fileName: doc.title,
            pinnedTo: { type: 'home' },
            createdAt: new Date(),
            uploadedBy: { email: '', fullName: '' },
            category: 'permit',
          });
        }
      }
    }
  } catch (_e) {}
  const home = await Home.create(base);
  return res.status(201).json(home);
}

const homeUpdateSchema = Joi.object({
  name: Joi.string().optional(),
  address: Joi.string().allow('').optional(),
  clientName: Joi.string().allow('').optional(),
  phases: Joi.array()
    .items(
      Joi.object({
        key: Joi.string()
          .valid(...PhaseKeyEnum)
          .required(),
        notes: Joi.string().allow('').optional(),
      })
    )
    .optional(),
});

async function updateHome(req, res) {
  const { homeId } = req.params;
  const { value, error } = homeUpdateSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const home = await Home.findByIdAndUpdate(homeId, { $set: value }, { new: true });
  if (!home) {
    return res.status(404).json({ message: 'Home not found' });
  }
  return res.json(home);
}

const bidCreateSchema = Joi.object({
  name: Joi.string().required(),
  phaseKeys: Joi.array()
    .items(Joi.string().valid(...PhaseKeyEnum))
    .min(1)
    .required(),
  vendor: Joi.object({
    name: Joi.string().allow(''),
    contactName: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    email: Joi.string().allow(''),
  }).optional(),
  totalPrice: Joi.number().min(0).optional(),
  notes: Joi.string().allow('').optional(),
});

async function addBid(req, res) {
  const { homeId } = req.params;
  const { value, error } = bidCreateSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const bid = {
    _id: uuidv4(),
    name: value.name,
    phaseKeys: value.phaseKeys,
    vendor: value.vendor || {},
    totalPrice: value.totalPrice || 0,
    additionalCosts: [],
    tasks: [],
    qualityChecks: [],
    notes: value.notes || '',
    attachments: [],
  };
  const home = await Home.findByIdAndUpdate(
    homeId,
    { $push: { trades: bid } },
    { new: true }
  );
  if (!home) {
    return res.status(404).json({ message: 'Home not found' });
  }
  return res.status(201).json({ home, bid });
}

const dependencyRefSchema = Joi.object({
  tradeId: Joi.string().required(),
  taskId: Joi.string().required(),
});

const taskCreateSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow('').optional(),
  phaseKey: Joi.string().valid(...PhaseKeyEnum).optional(),
  dueDate: Joi.date().optional(),
  assignee: Joi.string().allow('').optional(),
  dependsOn: Joi.array().items(dependencyRefSchema).optional(),
});

async function addTaskToBid(req, res) {
  const { homeId, bidId } = req.params;
  const { value, error } = taskCreateSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const task = {
    _id: uuidv4(),
    title: value.title,
    description: value.description || '',
    phaseKey: value.phaseKey || (value.phaseKeys && value.phaseKeys[0]) || 'preconstruction',
    status: 'todo',
    dueDate: value.dueDate || null,
    assignee: value.assignee || '',
    dependsOn: Array.isArray(value.dependsOn) ? value.dependsOn : [],
    checklist: [],
    comments: [],
  };

  const home = await Home.findOneAndUpdate(
    { _id: homeId, 'trades._id': bidId },
    { $push: { 'trades.$.tasks': task } },
    { new: true }
  );
  if (!home) {
    return res.status(404).json({ message: 'Home or Bid not found' });
  }
  return res.status(201).json({ home, task });
}

const scheduleCreateSchema = Joi.object({
  title: Joi.string().required(),
  startsAt: Joi.date().required(),
  endsAt: Joi.date().required(),
  location: Joi.string().allow('').optional(),
  bidId: Joi.string().allow('').optional(),
  taskId: Joi.string().allow('').optional(),
});

async function addSchedule(req, res) {
  const { homeId } = req.params;
  const { value, error } = scheduleCreateSchema.validate(req.body || {}, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const schedule = { _id: uuidv4(), ...value };
  const home = await Home.findByIdAndUpdate(
    homeId,
    { $push: { schedules: schedule } },
    { new: true }
  );
  if (!home) {
    return res.status(404).json({ message: 'Home not found' });
  }
  return res.status(201).json({ home, schedule });
}

const documentCreateSchema = Joi.object({
  title: Joi.string().required(),
  url: Joi.string().uri().required(),
  s3Key: Joi.string().allow('').optional(),
  category: Joi.string()
    .valid(
      'contract',
      'bid',
      'invoice',
      'picture',
      'permit',
      'other',
      'architecture_base',
      'architecture_structural',
      'architecture_foundation',
      'architecture_mep'
    )
    .optional(),
  version: Joi.number().integer().min(1).optional(),
  isFinal: Joi.boolean().optional(),
  pinnedTo: Joi.object({
    type: Joi.string().valid('home', 'trade', 'task').default('home'),
    id: Joi.string().allow('').optional(),
  }).optional(),
});

async function addDocument(req, res) {
  const { homeId } = req.params;
  const { value, error } = documentCreateSchema.validate(req.body || {}, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const current = await Home.findById(homeId);
  if (!current) {
    return res.status(404).json({ message: 'Home not found' });
  }
  // derive fileName if not provided via title
  let derivedFileName = value.title || '';
  try {
    const u = new URL(value.url);
    const last = decodeURIComponent((u.pathname || '').split('/').pop() || '');
    if (!derivedFileName && last) derivedFileName = last;
  } catch {}
  const uploadedBy = {
    email: (req?.user?.email || '').toLowerCase(),
    fullName: req?.user?.fullName || '',
  };
  const isArchitecture =
    value.category === 'architecture_base' ||
    value.category === 'architecture_structural' ||
    value.category === 'architecture_foundation' ||
    value.category === 'architecture_mep';
  let version = value.version;
  if (isArchitecture && (!version || version < 1)) {
    const existing = (current.documents || []).filter((d) => d.category === value.category);
    const maxVer = existing.reduce((m, d) => Math.max(m, Number(d.version || 0)), 0);
    version = Math.max(1, maxVer + 1);
  }
  const doc = {
    _id: uuidv4(),
    ...value,
    fileName: derivedFileName || value.title,
    uploadedBy,
    createdAt: new Date(),
    version: version || value.version || 1,
  };
  const home = await Home.findByIdAndUpdate(
    homeId,
    { $push: { documents: doc } },
    { new: true }
  );
  if (!home) {
    return res.status(404).json({ message: 'Home not found' });
  }
  if (doc.isFinal && doc.category) {
    await Home.updateOne(
      { _id: homeId },
      { $set: { 'documents.$[o].isFinal': false } },
      { arrayFilters: [{ 'o.category': doc.category, 'o._id': { $ne: String(doc._id) } }] }
    ).catch(() => {});
  }
  return res.status(201).json({ home, document: doc });
}

async function deleteDocument(req, res) {
  const { homeId, docId } = req.params;
  const home = await Home.findById(homeId);
  if (!home) {
    return res.status(404).json({ message: 'Home not found' });
  }
  const exists = (home.documents || []).some((d) => String(d._id) === String(docId));
  if (!exists) {
    return res.status(404).json({ message: 'Document not found' });
  }
  const updated = await Home.findByIdAndUpdate(
    homeId,
    { $pull: { documents: { _id: String(docId) } } },
    { new: true }
  );
  return res.json({ home: updated });
}

const documentUpdateSchema = Joi.object({
  title: Joi.string().optional(),
  category: Joi.string()
    .valid(
      'contract',
      'bid',
      'invoice',
      'picture',
      'permit',
      'other',
      'architecture_base',
      'architecture_structural',
      'architecture_foundation',
      'architecture_mep'
    )
    .optional(),
  version: Joi.number().integer().min(1).optional(),
  isFinal: Joi.boolean().optional(),
});

async function updateDocument(req, res) {
  const { homeId, docId } = req.params;
  const { value, error } = documentUpdateSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const home = await Home.findById(homeId);
  if (!home) return res.status(404).json({ message: 'Home not found' });
  const doc = (home.documents || []).find((d) => String(d._id) === String(docId));
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  const category = value.category !== undefined ? value.category : (doc.category || 'other');
  const set = {};
  if (value.title !== undefined) set['documents.$[d].title'] = value.title;
  if (value.category !== undefined) set['documents.$[d].category'] = value.category;
  if (value.version !== undefined) set['documents.$[d].version'] = value.version;
  if (value.isFinal !== undefined) set['documents.$[d].isFinal'] = value.isFinal;
  const updateOps = { $set: set };
  const arrayFilters = [{ 'd._id': String(docId) }];
  if (value.isFinal === true && category) {
    updateOps.$set['documents.$[o].isFinal'] = false;
    arrayFilters.push({ 'o.category': category, 'o._id': { $ne: String(docId) } });
  }
  const updated = await Home.findOneAndUpdate(
    { _id: homeId },
    updateOps,
    { new: true, arrayFilters }
  );
  if (!updated) return res.status(404).json({ message: 'Update failed' });
  return res.json(updated);
}

const qualityCheckCreateSchema = Joi.object({
  phaseKey: Joi.string().valid(...PhaseKeyEnum).required(),
  title: Joi.string().required(),
  notes: Joi.string().allow('').optional(),
});

async function addQualityCheckToBid(req, res) {
  const { homeId, bidId } = req.params;
  const { value, error } = qualityCheckCreateSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const qc = {
    _id: uuidv4(),
    phaseKey: value.phaseKey,
    title: value.title,
    notes: value.notes || '',
    accepted: false,
    acceptedBy: '',
    acceptedAt: null,
  };
  const home = await Home.findOneAndUpdate(
    { _id: homeId, 'trades._id': bidId },
    { $push: { 'trades.$.qualityChecks': qc } },
    { new: true }
  );
  if (!home) {
    return res.status(404).json({ message: 'Home or Bid not found' });
  }
  return res.status(201).json({ home, qualityCheck: qc });
}

const qualityCheckUpdateSchema = Joi.object({
  accepted: Joi.boolean().required(),
  acceptedBy: Joi.string().allow('').optional(),
});

async function updateQualityCheck(req, res) {
  const { homeId, bidId, checkId } = req.params;
  const { value, error } = qualityCheckUpdateSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const set = {};
  set['trades.$[b].qualityChecks.$[q].accepted'] = value.accepted;
  set['trades.$[b].qualityChecks.$[q].acceptedBy'] = value.accepted
    ? (value.acceptedBy || (req?.user && (req.user.email || req.user.fullName)) || '')
    : '';
  set['trades.$[b].qualityChecks.$[q].acceptedAt'] = value.accepted ? new Date() : null;
  const updated = await Home.findOneAndUpdate(
    { _id: homeId },
    { $set: set },
    { new: true, arrayFilters: [{ 'b._id': String(bidId) }, { 'q._id': String (checkId) }] }
  );
  if (!updated) return res.status(404).json({ message: 'Home/Trade/Check not found' });
  return res.json(updated);
}

module.exports = {
  listHomes,
  getHome,
  createHome,
  updateHome,
  addBid,
  addTaskToBid,
  addQualityCheckToBid,
  addSchedule,
  addDocument,
  updateDocument,
  deleteDocument,
  assignClientToHome,
  addMonitorToHome,
  updateTask,
  updateBid,
  addBidInvoice,
  updateBidInvoice,
  updateQualityCheck,
};

const assignPersonSchema = Joi.object({
  email: Joi.string().email().required(),
  fullName: Joi.string().allow('').optional(),
  phone: Joi.string().allow('').optional(),
});

async function assignClientToHome(req, res) {
  const { homeId } = req.params;
  const { value, error } = assignPersonSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const { email, fullName, phone } = value;
  const lower = email.toLowerCase();
  await Person.findOneAndUpdate(
    { email: lower },
    {
      $set: {
        fullName: fullName || email,
        phone: phone || '',
      },
      $addToSet: { roles: 'client' },
    },
    { upsert: true, new: true }
  );
  await Person.updateOne({ email: lower }, { $pull: { roles: 'monitor' } });
  const person = await Person.findOne({ email: lower });
  const updated = await Home.findByIdAndUpdate(
    homeId,
    {
      $set: {
        clientName: person.fullName,
        client: { fullName: person.fullName, email: person.email, phone: person.phone || '' },
      },
    },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: 'Home not found' });
  return res.json(updated);
}

async function addMonitorToHome(req, res) {
  const { homeId } = req.params;
  const { value, error } = assignPersonSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const { email, fullName, phone } = value;
  const person = await Person.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $set: {
        fullName: fullName || email,
        phone: phone || '',
      },
      $addToSet: { roles: 'monitor' },
    },
    { upsert: true, new: true }
  );
  const updated = await Home.findByIdAndUpdate(
    homeId,
    {
      $addToSet: {
        monitors: { email: person.email, fullName: person.fullName, phone: person.phone || '' },
      },
    },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: 'Home not found' });
  return res.json(updated);
}

const taskUpdateSchema = Joi.object({
  status: Joi.string().valid('todo', 'in_progress', 'blocked', 'done').optional(),
  title: Joi.string().optional(),
  description: Joi.string().allow('').optional(),
  completedBy: Joi.string().allow('').optional(),
  dependsOn: Joi.array().items(dependencyRefSchema).optional(),
});

async function updateTask(req, res) {
  const { homeId, bidId, taskId } = req.params;
  const { value, error } = taskUpdateSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const setObj = {};
  if (value.status !== undefined) {
    setObj['trades.$[b].tasks.$[t].status'] = value.status;
    if (value.status === 'done') {
      setObj['trades.$[b].tasks.$[t].completedAt'] = new Date();
      if (value.completedBy !== undefined) {
        setObj['trades.$[b].tasks.$[t].completedBy'] = value.completedBy;
      }
    } else {
      setObj['trades.$[b].tasks.$[t].completedAt'] = null;
      setObj['trades.$[b].tasks.$[t].completedBy'] = '';
    }
  }
  if (value.title !== undefined) setObj['trades.$[b].tasks.$[t].title'] = value.title;
  if (value.description !== undefined) setObj['trades.$[b].tasks.$[t].description'] = value.description;
  if (value.dependsOn !== undefined) setObj['trades.$[b].tasks.$[t].dependsOn'] = Array.isArray(value.dependsOn) ? value.dependsOn : [];

  const updated = await Home.findOneAndUpdate(
    { _id: homeId },
    { $set: setObj },
    { arrayFilters: [{ 'b._id': bidId }, { 't._id': taskId }], new: true }
  );
  if (!updated) {
    return res.status(404).json({ message: 'Home/Bid/Task not found' });
  }
  return res.json(updated);
}

const bidUpdateSchema = Joi.object({
  vendor: Joi.object({
    name: Joi.string().allow(''),
    contactName: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    email: Joi.string().allow(''),
  }).optional(),
  contacts: Joi.array().items(
    Joi.object({
      _id: Joi.string().optional(),
      company: Joi.string().allow('').optional(),
      fullName: Joi.string().allow('').optional(),
      email: Joi.string().email().allow('').optional(),
      phone: Joi.string().allow('').optional(),
      isPrimary: Joi.boolean().optional(),
    })
  ).optional(),
  totalPrice: Joi.number().min(0).optional(),
  totalPaid: Joi.number().min(0).optional(),
  notes: Joi.string().allow('').optional(),
});

async function updateBid(req, res) {
  const { homeId, bidId } = req.params;
  const { value, error } = bidUpdateSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  // load current trade to compute change log
  const currentHome = await Home.findById(homeId);
  if (!currentHome) return res.status(404).json({ message: 'Home not found' });
  const currentTrade = (currentHome.trades || []).find((t) => String(t._id) === String(bidId));
  if (!currentTrade) return res.status(404).json({ message: 'Trade not found' });
  const changeEntries = [];
  const actor = (req.user && (req.user.email || req.user.fullName)) || 'unknown';
  if (value.totalPrice !== undefined && Number(value.totalPrice) !== Number(currentTrade.totalPrice || 0)) {
    changeEntries.push({
      _id: uuidv4(),
      field: 'totalPrice',
      oldValue: currentTrade.totalPrice || 0,
      newValue: value.totalPrice,
      changedBy: actor,
      changedAt: new Date(),
    });
  }
  if (value.vendor !== undefined && JSON.stringify(value.vendor || {}) !== JSON.stringify(currentTrade.vendor || {})) {
    changeEntries.push({
      _id: uuidv4(),
      field: 'vendor',
      oldValue: currentTrade.vendor || {},
      newValue: value.vendor || {},
      changedBy: actor,
      changedAt: new Date(),
    });
  }
  if (value.contacts !== undefined && JSON.stringify(value.contacts || []) !== JSON.stringify(currentTrade.contacts || [])) {
    changeEntries.push({
      _id: uuidv4(),
      field: 'contacts',
      oldValue: currentTrade.contacts || [],
      newValue: value.contacts || [],
      changedBy: actor,
      changedAt: new Date(),
    });
  }
  if (value.notes !== undefined && String(value.notes || '') !== String(currentTrade.notes || '')) {
    changeEntries.push({
      _id: uuidv4(),
      field: 'notes',
      oldValue: currentTrade.notes || '',
      newValue: value.notes || '',
      changedBy: actor,
      changedAt: new Date(),
    });
  }
  const set = {};
  if (value.vendor !== undefined) set['trades.$.vendor'] = value.vendor;
  if (value.contacts !== undefined) set['trades.$.contacts'] = (value.contacts || []).map(c => ({
    _id: c._id || uuidv4(),
    company: c.company || '',
    fullName: c.fullName || '',
    email: c.email || '',
    phone: c.phone || '',
    isPrimary: !!c.isPrimary,
  }));
  if (value.totalPrice !== undefined) set['trades.$.totalPrice'] = value.totalPrice;
  if (value.totalPaid !== undefined) set['trades.$.totalPaid'] = value.totalPaid;
  if (value.notes !== undefined) set['trades.$.notes'] = value.notes;
  const updateQuery = {
    $set: set,
  };
  if (changeEntries.length) {
    updateQuery.$push = { 'trades.$.changeLog': { $each: changeEntries } };
  }
  const updated = await Home.findOneAndUpdate(
    { _id: homeId, 'trades._id': bidId },
    updateQuery,
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: 'Home/Bid not found' });
  return res.json(updated);
}

const addInvoiceSchema = Joi.object({
  label: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  dueDate: Joi.date().optional(),
});

async function addBidInvoice(req, res) {
  const { homeId, bidId } = req.params;
  const { value, error } = addInvoiceSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const invoice = {
    _id: uuidv4(),
    label: value.label,
    amount: value.amount,
    dueDate: value.dueDate || null,
    paid: false,
    createdAt: new Date(),
  };
  const updated = await Home.findOneAndUpdate(
    { _id: homeId, 'trades._id': bidId },
    { $push: { 'trades.$.invoices': invoice } },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: 'Home/Bid not found' });
  return res.status(201).json({ home: updated, invoice });
}

const updateInvoiceSchema = Joi.object({
  paid: Joi.boolean().optional(),
});

async function updateBidInvoice(req, res) {
  const { homeId, bidId, invoiceId } = req.params;
  const { value, error } = updateInvoiceSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const set = {};
  if (value.paid !== undefined) {
    set['trades.$[b].invoices.$[i].paid'] = value.paid;
    set['trades.$[b].invoices.$[i].paidAt'] = value.paid ? new Date() : null;
  }
  const updated = await Home.findOneAndUpdate(
    { _id: homeId },
    { $set: set },
    { arrayFilters: [{ 'b._id': bidId }, { 'i._id': invoiceId }], new: true }
  );
  if (!updated) return res.status(404).json({ message: 'Home/Bid/Invoice not found' });
  return res.json(updated);
}


