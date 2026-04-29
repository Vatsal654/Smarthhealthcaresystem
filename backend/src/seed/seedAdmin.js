/**
 * Bootstrap an admin account.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@shs.dev ADMIN_PASSWORD=changeme123 npm run seed:admin
 */

require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const logger = require('../utils/logger');

async function run() {
  const email = (process.env.ADMIN_EMAIL || 'admin@shs.dev').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin12345';
  const name = process.env.ADMIN_NAME || 'SHS Admin';

  await connectDB();

  let user = await User.findOne({ email });
  if (user) {
    user.role = 'admin';
    user.disabled = false;
    await user.setPassword(password);
    await user.save();
    logger.info(`Admin updated: ${email}`);
  } else {
    user = new User({ email, name, role: 'admin' });
    await user.setPassword(password);
    await user.save();
    logger.info(`Admin created: ${email}`);
  }

  logger.info(`Login with: ${email} / ${password}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error('Admin seed failed', err);
  process.exit(1);
});
