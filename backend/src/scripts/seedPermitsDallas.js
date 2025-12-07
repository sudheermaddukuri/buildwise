/* eslint-disable no-console */
const mongoose = require('mongoose');
const { PermitDocumentSet } = require('../models/PermitDocumentSet');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/customhome';
  await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB || undefined });
  console.log('Connected to MongoDB');

  const cities = [
    { city: 'Dallas', zips: ['75201', '75202', '75204', '75205', '75206', '75214', '75219', '75225', '75230'] },
    { city: 'Plano', zips: ['75023', '75024', '75025', '75074', '75075'] },
    { city: 'Frisco', zips: ['75034', '75035'] },
    { city: 'Irving', zips: ['75038', '75039', '75060', '75061', '75062', '75063'] },
    { city: 'Arlington', zips: ['76010', '76011', '76012', '76013', '76014', '76015', '76016', '76017'] },
    { city: 'McKinney', zips: ['75069', '75070', '75071'] },
    { city: 'Garland', zips: ['75040', '75041', '75042', '75043', '75044'] },
    { city: 'Richardson', zips: ['75080', '75081', '75082'] },
    { city: 'Addison', zips: ['75001'] },
    { city: 'Carrollton', zips: ['75006', '75007'] },
    { city: 'Allen', zips: ['75002', '75013'] },
    { city: 'Lewisville', zips: ['75057', '75067', '75077'] },
    { city: 'Mesquite', zips: ['75149', '75150', '75181'] },
    { city: 'Coppell', zips: ['75019'] },
  ];

  const docsNewHome = [
    { title: 'Residential New Home Permit Application', url: 'https://example.com/permits/dallas/new-home-application.pdf' },
    { title: 'Residential Plan Review Checklist', url: 'https://example.com/permits/dallas/plan-review-checklist.pdf' },
    { title: 'Energy Code Compliance Form', url: 'https://example.com/permits/dallas/energy-code-form.pdf' },
  ];
  const docsPool = [
    { title: 'Residential Pool Permit Application', url: 'https://example.com/permits/dallas/pool-application.pdf' },
    { title: 'Pool Safety and Barrier Checklist', url: 'https://example.com/permits/dallas/pool-safety-checklist.pdf' },
  ];

  for (const c of cities) {
    for (const projectType of ['new_home', 'pool']) {
      const exists = await PermitDocumentSet.findOne({ city: c.city, state: 'TX', projectType });
      if (exists) {
        console.log(`Skipping ${c.city} ${projectType} (already exists)`);
        continue;
      }
      const docs = projectType === 'new_home' ? docsNewHome : docsPool;
      await PermitDocumentSet.create({
        city: c.city,
        state: 'TX',
        zipCodes: c.zips,
        projectType,
        documents: docs,
      });
      console.log(`Seeded ${c.city} (${projectType})`);
    }
  }
  console.log('Done');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });


