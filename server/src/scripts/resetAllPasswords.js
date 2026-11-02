import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { User } from '../models/index.js';

async function main() {
  await connectDatabase();
  console.log('Connected to MongoDB.');

  const commonPassword = 'Password123';
  const users = await User.find({});

  for (const user of users) {
    await user.setPassword(commonPassword);
    user.mustChangePassword = false;
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();
    console.log(`Password reset to "${commonPassword}" for: ${user.name} (${user.email})`);
  }

  await disconnectDatabase();
  console.log(`\nAll ${users.length} users updated to password: ${commonPassword}`);
}

main().catch((err) => {
  console.error('Password reset failed:', err);
  process.exit(1);
});

