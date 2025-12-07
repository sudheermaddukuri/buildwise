const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { Person } = require('../models/Person');
const { signToken } = require('../middleware/auth');
const { Account } = require('../models/Account');
const crypto = require('crypto');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  fullName: Joi.string().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().allow('').optional(),
});

async function register(req, res) {
  const { value, error } = registerSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const { email, fullName, phone, password } = value;
  const existing = await Person.findOne({ email: email.toLowerCase() });
  if (existing && existing.passwordHash) {
    return res.status(409).json({ message: 'User already exists' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  // Allow completing registration for any invited user (pre-created Person without password)
  if (!existing) {
    return res.status(403).json({ message: 'Registration requires invitation' });
  }
  const person = await Person.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: { fullName, phone: phone || '', passwordHash } },
    { new: true }
  );
  const token = signToken({ email: person.email, fullName: person.fullName, roles: person.roles });
  res.json({
    token,
    user: {
      email: person.email,
      fullName: person.fullName,
      phone: person.phone || '',
      roles: person.roles || [],
    },
  });
}

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

async function login(req, res) {
  const { value, error } = loginSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const { email, password } = value;
  const person = await Person.findOne({ email: email.toLowerCase() });
  if (!person || !person.passwordHash) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password, person.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = signToken({ email: person.email, fullName: person.fullName, roles: person.roles });
  res.json({
    token,
    user: {
      email: person.email,
      fullName: person.fullName,
      phone: person.phone || '',
      roles: person.roles || [],
    },
  });
}

async function me(req, res) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const person = await Person.findOne({ email: req.user.email.toLowerCase() });
  if (!person) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({
    email: person.email,
    fullName: person.fullName,
    phone: person.phone || '',
    roles: person.roles || [],
  });
}

// Registration for marketing signups with free trial subscription
const marketingRegisterSchema = Joi.object({
  email: Joi.string().email().required(),
  fullName: Joi.string().required(),
  password: Joi.string().min(6).required(),
  planId: Joi.string().valid('guide', 'ai_assurance').default('guide'),
  acceptedTerms: Joi.boolean().valid(true).required(),
  termsVersion: Joi.string().allow('').optional(),
});

async function registerMarketing(req, res) {
  const { value, error } = marketingRegisterSchema.validate(req.body || {}, { abortEarly: false });
  if (error) return res.status(400).json({ message: 'Validation failed', details: error.details });
  const { email, fullName, password, planId, acceptedTerms, termsVersion } = value;
  const lower = email.toLowerCase();
  const existing = await Person.findOne({ email: lower });
  if (existing && existing.passwordHash) {
    return res.status(409).json({ message: 'User already exists' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const confirmToken = crypto.randomBytes(24).toString('hex');
  const confirmExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const clientIp = req.ip;
  const person = existing
    ? await Person.findOneAndUpdate(
        { email: lower },
        { $set: { fullName, passwordHash, emailConfirmed: false, emailConfirmToken: confirmToken, emailConfirmExpires: confirmExpires, agreedToTermsAt: now, agreedToTermsVersion: termsVersion || 'marketing', agreedToTermsIp: clientIp }, $addToSet: { roles: 'builder' } },
        { new: true }
      )
    : await Person.create({
        email: lower,
        fullName,
        phone: '',
        passwordHash,
        roles: ['builder'],
        emailConfirmed: false,
        emailConfirmToken: confirmToken,
        emailConfirmExpires: confirmExpires,
        agreedToTermsAt: now,
        agreedToTermsVersion: termsVersion || 'marketing',
        agreedToTermsIp: clientIp,
      });
  // Create account with 90-day free trial
  const existingAccount = await Account.findOne({ primaryEmail: lower });
  if (!existingAccount) {
    const trialEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    await Account.create({
      name: `${fullName}'s Account`,
      primaryEmail: lower,
      members: [{ email: lower, fullName, role: 'owner' }],
      subscription: { status: 'active', planId: planId === 'guide' ? 'guide' : 'ai_assurance', startedAt: new Date(), currentPeriodEnd: trialEnd },
    });
  }
  // Send confirmation email via SMTP (fallback to console when not configured)
  const appBase = process.env.APP_PUBLIC_URL || process.env.MARKETING_URL || ''
  const confirmUrl = appBase ? `${appBase.replace(/\/+$/, '')}/confirm-email?token=${confirmToken}&email=${encodeURIComponent(lower)}` : `confirm-email?token=${confirmToken}&email=${encodeURIComponent(lower)}`
  try {
    const mailer = require('../services/mailer');
    await mailer.sendConfirmEmail({ to: lower, confirmUrl }).catch(() => {})
  } catch (_e) {}
  return res.status(201).json({ message: 'Registered. Please check your email to confirm your account.' });
}

const confirmSchema = Joi.object({
  token: Joi.string().required(),
  email: Joi.string().email().required(),
});

async function confirmEmail(req, res) {
  const { value, error } = confirmSchema.validate(req.query || {}, { abortEarly: false });
  if (error) return res.status(400).json({ message: 'Validation failed', details: error.details });
  const { token, email } = value;
  const lower = email.toLowerCase();
  const person = await Person.findOne({ email: lower, emailConfirmToken: token });
  if (!person) return res.status(400).json({ message: 'Invalid token' });
  if (person.emailConfirmExpires && person.emailConfirmExpires.getTime() < Date.now()) {
    return res.status(400).json({ message: 'Token expired' });
  }
  await Person.updateOne({ _id: person._id }, { $set: { emailConfirmed: true, emailConfirmToken: null, emailConfirmExpires: null } });
  return res.json({ message: 'Email confirmed. You can now log in.' });
}

module.exports = { register, login, me, registerMarketing, confirmEmail };


