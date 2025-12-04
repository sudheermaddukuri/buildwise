const Joi = require('joi');
const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AiLog } = require('../models/AiLog');
const { Message } = require('../models/Message');
const { Home } = require('../models/Home');
const { buildTradePrompt } = require('../services/bidComparisonPrompts');

const analyzeSchema = Joi.object({
  // Allow either a single URL or an array of URLs
  url: Joi.string().uri(),
  urls: Joi.array().items(Joi.string().uri()),
  prompt: Joi.string().min(1).required(),
}).xor('url', 'urls');

function ensureOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  return new OpenAI({ apiKey });
}

async function fetchArrayBuffer(u) {
  const fetchImpl = global.fetch ? global.fetch.bind(global) : (await import('node-fetch')).default;
  const res = await fetchImpl(u);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Fetch failed (${res.status}) ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  const arrayBuffer = await res.arrayBuffer();
  return { arrayBuffer, contentType };
}

async function extractTextFromUrl(u) {
  const { arrayBuffer, contentType } = await fetchArrayBuffer(u);
  const buf = Buffer.from(arrayBuffer);
  if (/application\/pdf/i.test(contentType) || /\.pdf($|[\?#])/i.test(u)) {
    const parsed = await pdfParse(buf);
    return parsed.text || '';
  }
  if (/^text\//i.test(contentType) || /application\/(json|xml)/i.test(contentType)) {
    return buf.toString('utf8');
  }
  // Fallback: try utf8 decode
  return buf.toString('utf8');
}

async function analyzeUrl(req, res) {
  const { value, error } = analyzeSchema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const { url, urls, prompt } = value;
  try {
    const openai = ensureOpenAI();
    let combined = '';
    if (urls && Array.isArray(urls) && urls.length > 0) {
      for (let i = 0; i < urls.length; i++) {
        const u = urls[i];
        try {
          const text = await extractTextFromUrl(u);
          if (text && text.trim()) {
            const header = `\n\n--- Document ${i + 1}: ${u} ---\n`;
            combined += `${header}${text}`;
            if (combined.length > 200000) break; // ~200k chars cap
          }
        } catch (e) {
          combined += `\n\n--- Document ${i + 1}: ${u} (could not retrieve: ${e.message}) ---\n`;
        }
      }
    } else if (url) {
      combined = await extractTextFromUrl(url);
    }
    if (!combined || combined.trim().length === 0) {
      return res.status(415).json({ message: 'Unsupported or empty content at URL(s)' });
    }

    const system = [
      'You are Buildwise AI. Analyze construction-related documents and provide clear, actionable, and accurate insights.',
      'If there are uncertainties or missing data, call them out explicitly.',
      'Keep answers concise and structured.'
    ].join(' ');
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: `User prompt: ${prompt}` },
      { role: 'user', content: `Relevant document text:\n${combined.slice(0, 200000)}` }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
    });
    const text = completion?.choices?.[0]?.message?.content?.toString?.() || '';

    // Log usage/result
    try {
      await AiLog.create({
        userEmail: req?.user?.email || null,
        mode: (urls && urls.length ? 'urls' : 'url'),
        prompt,
        urls: urls && urls.length ? urls : (url ? [url] : []),
        model: completion?.model || 'gpt-4o-mini',
        responseText: text,
        usage: completion?.usage || undefined,
      });
    } catch (_e) {}

    res.json({
      result: text,
      model: completion?.model || 'gpt-4o-mini',
      usage: completion?.usage || undefined,
    });
  } catch (e) {
    res.status(500).json({ message: e.message || 'OpenAI analysis failed' });
  }
}

// Analyze by uploading files to OpenAI (file_search) so the model can read PDFs/diagrams
async function analyzeFilesDirectToOpenAI(req, res) {
  const schema = Joi.object({
    urls: Joi.array().items(Joi.string().uri()).min(1).required(),
    prompt: Joi.string().min(1).required(),
    model: Joi.string().optional(),
  });
  const { value, error } = schema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const { urls, prompt, model } = value;
  try {
    const openai = ensureOpenAI();
    // Support images (vision) and text/PDFs (text extraction)
    const imageUrlRegex = /\.(png|jpe?g|webp|gif)$/i;
    let combined = '';
    const imageUrls = [];
    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      if (imageUrlRegex.test(u)) {
        imageUrls.push(u);
        continue;
      }
      try {
        const text = await extractTextFromUrl(u);
        if (text && text.trim()) {
          const header = `\n\n--- Document ${i + 1}: ${u} ---\n`;
          combined += `${header}${text}`;
          if (combined.length > 200_000) break;
        }
      } catch (e) {
        combined += `\n\n--- Document ${i + 1}: ${u} (could not retrieve: ${e.message}) ---\n`;
      }
    }
    if (!combined.trim() && imageUrls.length === 0) {
      return res.status(415).json({ message: 'Unsupported or empty content at URL(s)' });
    }
    const usedModel = model || (imageUrls.length > 0 ? 'gpt-4o' : 'gpt-4o-mini');
    const system = [
      'You are Buildwise AI. Analyze construction-related documents and images and provide clear, actionable, and accurate insights.',
      'If there are uncertainties or missing data, call them out explicitly.',
      'Keep answers concise and structured.'
    ].join(' ');
    let completion;
    if (imageUrls.length === 0) {
      // Text/PDF-only flow: use plain string messages to avoid any parsing ambiguities
      completion = await openai.chat.completions.create({
        model: usedModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `User prompt:\n${prompt}\n\nRelevant document text:\n${combined.slice(0, 200000)}` },
        ],
        temperature: 0.2,
      });
    } else {
      // Mixed content (images): use multi-part content for vision support
      const userContent = [];
      userContent.push({ type: 'text', text: `User prompt: ${prompt}` });
      if (combined.trim()) {
        userContent.push({ type: 'text', text: `Relevant document text:\n${combined.slice(0, 200000)}` });
      }
      for (const img of imageUrls.slice(0, 10)) {
        userContent.push({ type: 'image_url', image_url: { url: img } });
      }
      completion = await openai.chat.completions.create({
        model: usedModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
        temperature: 0.2,
      });
    }
    const result = completion?.choices?.[0]?.message?.content?.toString?.() || '';
    try {
      await AiLog.create({
        userEmail: req?.user?.email || null,
        mode: 'files',
        prompt,
        urls,
        model: completion?.model || usedModel,
        responseText: result,
        usage: completion?.usage || undefined,
      });
    } catch (_e) {}
    res.json({ result, model: completion?.model || usedModel, usage: completion?.usage, echoPrompt: prompt });
  } catch (e) {
    res.status(500).json({ message: e.message || 'OpenAI file analysis failed' });
  }
}
 
// Analyze with trade/task context: include messages and trade-specific prompt
async function analyzeTradeContext(req, res) {
  const schema = Joi.object({
    homeId: Joi.string().required(),
    tradeId: Joi.string().allow('').optional(),
    taskId: Joi.string().allow('').optional(),
    urls: Joi.array().items(Joi.string().uri()).optional(),
    prompt: Joi.string().allow('').optional(),
    model: Joi.string().optional(),
  }).or('tradeId', 'taskId');
  const { value, error } = schema.validate(req.body || {}, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Validation failed', details: error.details });
  }
  const { homeId, tradeId, taskId, urls = [], prompt, model } = value;
  try {
    const openai = ensureOpenAI();
    const usedModel = model || 'gpt-4o-mini';
    const query = { homeId: String(homeId) };
    if (tradeId) query.tradeId = String(tradeId);
    if (taskId) query.taskId = String(taskId);
    const msgs = await Message.find(query).sort({ createdAt: -1 }).limit(200).lean();
    const msgText = (msgs || [])
      .map((m) => {
        const who = m.author?.fullName || m.author?.email || 'Unknown';
        return `- ${new Date(m.createdAt).toISOString()} ${who}: ${m.text || ''}`;
      })
      .join('\n');
    let docsText = '';
    for (let i = 0; i < Math.min(urls.length, 10); i++) {
      const u = urls[i];
      try {
        const t = await extractTextFromUrl(u);
        if (t && t.trim()) {
          const header = `\n\n--- Attachment ${i + 1}: ${u} ---\n`;
          docsText += `${header}${t}`;
          if (docsText.length > 150_000) break;
        }
      } catch (e) {
        docsText += `\n\n--- Attachment ${i + 1}: ${u} (could not retrieve: ${e.message}) ---\n`;
      }
    }
    let tradePrompt = '';
    if (tradeId) {
      const home = await Home.findById(homeId).lean();
      const trade = (home?.trades || []).find((t) => String(t._id) === String(tradeId));
      if (trade) {
        tradePrompt = buildTradePrompt(trade.name || trade.category || '', '');
      }
    }
    const system = [
      'You are Buildwise AI. Provide accurate, structured construction analysis.',
      'Use provided context from project messages and documents. Call out uncertainties explicitly.',
      'Keep answers structured, specific, and concise where possible.',
    ].join(' ');
    const userParts = [];
    const userPrompt = prompt && prompt.trim()
      ? `User prompt:\n${prompt.trim()}\n`
      : (tradePrompt ? `Guidance:\n${tradePrompt}\n` : 'Provide a concise, structured analysis.\n');
    userParts.push(userPrompt);
    if (tradePrompt && prompt && prompt.trim()) {
      userParts.push(`Trade context:\n${tradePrompt}\n`);
    }
    if (msgText.trim()) {
      userParts.push(`Recent project messages:\n${msgText.slice(0, 50_000)}\n`);
    }
    if (docsText.trim()) {
      userParts.push(`Relevant document text:\n${docsText.slice(0, 150_000)}\n`);
    }
    const completion = await openai.chat.completions.create({
      model: usedModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userParts.join('\n') },
      ],
      temperature: 0.2,
    });
    const result = completion?.choices?.[0]?.message?.content?.toString?.() || '';
    try {
      await AiLog.create({
        userEmail: req?.user?.email || null,
        mode: 'trade',
        prompt: prompt || tradePrompt || '',
        urls,
        model: completion?.model || usedModel,
        responseText: result,
        usage: completion?.usage || undefined,
      });
    } catch (_e) {}
    return res.json({ result, model: completion?.model || usedModel, usage: completion?.usage });
  } catch (e) {
    return res.status(500).json({ message: e.message || 'Trade analysis failed' });
  }
}

module.exports = { analyzeUrl, analyzeFiles: analyzeFilesDirectToOpenAI, analyzeTradeContext };

