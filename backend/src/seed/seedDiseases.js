/**
 * Seed the `diseases` collection from data/diseases.json.
 *
 * Usage:
 *   npm run seed                  # upsert from project-root diseases.json
 *   node src/seed/seedDiseases.js path/to/file.json
 *
 * Resolution order for the dataset:
 *   1. CLI argument
 *   2. ./data/diseases.json (in backend folder)
 *   3. ../diseases.json     (project root, the one you already have)
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Disease = require('../models/Disease');
const logger = require('../utils/logger');

function resolveDatasetPath() {
  const cli = process.argv[2];
  const candidates = [
    cli && path.resolve(process.cwd(), cli),
    path.resolve(__dirname, '../../data/diseases.json'),
    path.resolve(__dirname, '../../../diseases.json'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function normalize(raw) {
  return {
    name: String(raw.name || '').trim(),
    category: raw.category || 'general',
    symptoms: (raw.symptoms || []).map((s) => String(s).toLowerCase().trim()),
    severity: ['mild', 'moderate', 'severe'].includes(raw.severity)
      ? raw.severity
      : 'moderate',
    riskLevel: ['green', 'yellow', 'red'].includes(raw.riskLevel)
      ? raw.riskLevel
      : 'yellow',
    homeRemedies: raw.homeRemedies || [],
    medicines: raw.medicines || [],
    specialist: raw.specialist || 'General Physician',
    description: raw.description || '',
    redFlags: raw.redFlags || [],
  };
}

async function run() {
  const file = resolveDatasetPath();
  if (!file) {
    logger.error(
      'No diseases.json found. Place one at backend/data/diseases.json or project root.'
    );
    process.exit(1);
  }

  logger.info(`Seeding from ${file}`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
  if (!Array.isArray(raw)) {
    logger.error('diseases.json must be an array');
    process.exit(1);
  }

  await connectDB();

  let inserted = 0;
  let updated = 0;
  for (const item of raw) {
    const doc = normalize(item);
    if (!doc.name) continue;
    const res = await Disease.updateOne(
      { name: doc.name },
      { $set: doc },
      { upsert: true }
    );
    if (res.upsertedCount) inserted += 1;
    else if (res.modifiedCount) updated += 1;
  }

  const total = await Disease.countDocuments();
  logger.info(`Done. inserted=${inserted} updated=${updated} total=${total}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
