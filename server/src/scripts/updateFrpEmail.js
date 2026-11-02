import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { User, Notification } from '../models/index.js';

async function main() {
  await connectDatabase();
  console.log('Connected to database.');

  // 1. Update FRP User email to snehaa1078@gmail.com
  const existingOldFrp = await User.findOne({ email: 'frp@example.test' });
  if (existingOldFrp) {
    existingOldFrp.email = 'snehaa1078@gmail.com';
    existingOldFrp.name = 'FRP (Sneha)';
    await existingOldFrp.save();
    console.log('Updated existing user frp@example.test to snehaa1078@gmail.com');
  } else {
    const existingSnehaFrp = await User.findOne({ email: 'snehaa1078@gmail.com' });
    if (existingSnehaFrp) {
      console.log('User snehaa1078@gmail.com already exists in database.');
    } else {
      console.log('No user found with frp@example.test or snehaa1078@gmail.com.');
    }
  }

  // 2. Cancel and mark any failing notifications targeted to fake domains to stop recursion bounce-backs
  const cancelledResult = await Notification.updateMany(
    {
      $or: [
        { recipient: /example\.test/i },
        { recipient: 'frp@example.test' },
      ],
      status: { $in: ['QUEUED', 'FAILED'] },
    },
    {
      $set: {
        status: 'FAILED',
        lastError: 'Cancelled to prevent Mailer-Daemon bounce recursion loop.',
        lockedUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000), // lock out forever
      },
    }
  );
  console.log(`Cancelled ${cancelledResult.modifiedCount} stuck notifications with fake recipient domains.`);

  await disconnectDatabase();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Error updating FRP email:', err);
  process.exit(1);
});

