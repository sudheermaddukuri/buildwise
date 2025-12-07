const Joi = require('joi');
const { Person } = require('../models/Person');
const { Home } = require('../models/Home');
const { v4: uuidv4 } = require('uuid');
const { getTemplateById } = require('../templates');
const { Template } = require('../models/Template');
const mailer = require('../services/mailer');

const personSchema = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow('').optional(),
});

const participantSchema = Joi.object({
  fullName: Joi.string().allow('').optional(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow('').optional(),
  role: Joi.string().valid('partner', 'builder', 'coordinator', 'builder advisor', 'architect', 'interior decorator').required(),
});

const onboardingSchema = Joi.object({
  client: personSchema.optional(),
  monitors: Joi.array().items(personSchema).default([]),
  builder: personSchema.optional(),
  participants: Joi.array().items(participantSchema).default([]),
  home: Joi.object({
    name: Joi.string().required(),
    address: Joi.string().allow('').optional(),
    withTemplates: Joi.boolean().default(true),
    templateId: Joi.string().allow('').optional(),
  }).required(),
});

async function buildBidsFromTemplate(templateId) {
  // Try DB template by id first; fallback to static
  let trades = [];
  if (templateId) {
    const dbT = await Template.findById(templateId);
    if (dbT && dbT.trades) {
      trades = dbT.trades;
    }
  }
  if (!trades.length) {
    const template = getTemplateById(templateId || 'single_family');
    trades = (template?.getBids?.() || []);
  }
  const bids = (trades || []).map((b) => {
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
    return {
      _id: uuidv4(),
      name: b.name,
      phaseKeys: b.phaseKeys,
      vendor: {},
      tasks,
      qualityChecks: (b.qualityChecks || []).map((qc) => ({
        _id: uuidv4(),
        phaseKey: qc.phaseKey,
        title: qc.title,
        notes: qc.notes || '',
        accepted: false,
        acceptedBy: '',
        acceptedAt: null,
      })),
      totalPrice: 0,
      additionalCosts: [],
      notes: '',
      attachments: [],
    };
  });
  return bids;
}

async function onboardingCreate(req, res) {
  const { value, error } = onboardingSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const { client, monitors, builder, participants, home } = value;

  // Upsert people
  const ensurePerson = async (p, role) => {
    const email = p.email.toLowerCase();
    // First, upsert and add desired role
    const first = await Person.findOneAndUpdate(
      { email },
      { $set: { fullName: p.fullName, phone: p.phone || '' }, $addToSet: { roles: role } },
      { upsert: true, new: true }
    );
    // If promoting to client, remove monitor in a separate operation to avoid conflicting ops
    if (role === 'client') {
      await Person.updateOne({ email }, { $pull: { roles: 'monitor' } });
      return await Person.findOne({ email });
    }
    return first;
  };

  let clientDoc = null;
  let builderDoc = null;
  const monitorDocs = [];
  for (const m of monitors) {
    // silently skip duplicates by email in the input
    if (!monitorDocs.find((x) => x.email.toLowerCase() === m.email.toLowerCase())) {
      monitorDocs.push(await ensurePerson(m, 'monitor'));
    }
  }
  // Participants: upsert persons with appropriate global role mapping, and use them to fill missing client/builder
  const normalizedParticipants = [];
  for (const p of participants) {
    const lower = p.email.toLowerCase();
    if (normalizedParticipants.find((x) => x.email === lower)) continue;
    const role = p.role;
    let globalRole = 'monitor';
    if (role === 'partner') globalRole = 'client';
    if (role === 'builder' || role === 'builder advisor') globalRole = 'builder';
    const ensured = await ensurePerson(
      { fullName: p.fullName || p.email, email: lower, phone: p.phone || '' },
      globalRole
    );
    normalizedParticipants.push({
      fullName: ensured.fullName,
      email: ensured.email,
      phone: ensured.phone || '',
      role: role,
    });
  }
  // Derive client/builder if not explicitly provided
  if (!client && normalizedParticipants.length) {
    const partner = normalizedParticipants.find((p) => p.role === 'partner');
    if (partner) {
      clientDoc = await Person.findOne({ email: partner.email.toLowerCase() });
    }
  }
  if (!builder && normalizedParticipants.length) {
    const b = normalizedParticipants.find((p) => p.role === 'builder') || normalizedParticipants.find((p) => p.role === 'builder advisor');
    if (b) {
      builderDoc = await Person.findOne({ email: b.email.toLowerCase() });
    }
  }
  // If still missing, but provided directly, use those
  if (!clientDoc && client) clientDoc = await ensurePerson(client, 'client');
  if (!builderDoc && builder) builderDoc = await ensurePerson(builder, 'builder');

  // Create Home document embedding snapshots of people
  const trades = home.withTemplates ? await buildBidsFromTemplate(home.templateId) : [];
  const createdHome = await Home.create({
    name: home.name,
    address: home.address || '',
    clientName: clientDoc ? clientDoc.fullName : '',
    client: clientDoc ? {
      fullName: clientDoc.fullName,
      email: clientDoc.email,
      phone: clientDoc.phone || '',
    } : undefined,
    builder: builderDoc ? {
      fullName: builderDoc.fullName,
      email: builderDoc.email,
      phone: builderDoc.phone || '',
    } : undefined,
    monitors: monitorDocs.map((md) => ({
      fullName: md.fullName,
      email: md.email,
      phone: md.phone || '',
    })),
    participants: normalizedParticipants,
    phases: [
      { key: 'planning', notes: '' },
      { key: 'preconstruction', notes: '' },
      { key: 'exterior', notes: '' },
      { key: 'interior', notes: '' },
    ],
    trades,
    schedules: [],
    documents: [],
  });

  // Send SMTP invites; fall back to console when SMTP not configured
  try {
    const appBase = process.env.APP_PUBLIC_URL || process.env.MARKETING_URL || ''
    for (const p of normalizedParticipants) {
      const person = await Person.findOne({ email: p.email.toLowerCase() })
      if (person && !person.passwordHash) {
        const registerUrl = appBase
          ? `${appBase.replace(/\/+$/, '')}/register?email=${encodeURIComponent(person.email)}`
          : `register?email=${encodeURIComponent(person.email)}`
        await mailer.sendInviteEmail({
          to: person.email,
          homeName: createdHome.name,
          registerUrl,
          role: p.role,
        }).catch(() => {})
      }
    }
  } catch (_e) {}

  res.status(201).json({ home: createdHome });
}

module.exports = { onboardingCreate };


