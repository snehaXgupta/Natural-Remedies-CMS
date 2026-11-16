import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import mongoose from 'mongoose';

// Ensure DNS resolution for mongodb+srv on Windows machines
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const uri =
  process.env.MONGODB_URI?.includes('mongodb+srv')
    ? process.env.MONGODB_URI
    : 'mongodb+srv://cmsadmin:password123sneha@serverpanelcluster0.rirs7s4.mongodb.net/sfa_cms?retryWrites=true&w=majority';

const CMO_LOCATIONS = [
  'Indus spray-3003',
  'Karsgy health care-3009',
  'JCK-3004',
  'Maven lab-3005',
  'Ratna biotek-3006',
  'Venkat pharma-3007',
  'Laxmi herbals-3012',
  'Purex laboratories (Bangalore)-3015',
  'Primacy industries-3016',
  'Peenya pharma-3029',
  'Medi chem labs-3031',
  'Mahadeshwara herbals-3032',
  'Shamanur pharma-3033',
  'Varshita Herbals-3011',
  '5B (NRPL Pet)-1400',
  'Pai Veterinary-4000',
  'Pondchy Pharma-4200',
  'Harshavardhan-4200',
  'B&K Products-1400',
  'Neos Park Hyderabad-4000',
];

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('Connected.');

  const lookupCol = mongoose.connection.collection('lookupvalues');
  const userCol = mongoose.connection.collection('users');

  // 1. Remove lookups with "demo" in value
  const delLookups = await lookupCol.deleteMany({
    $or: [{ value: /demo/i }, { parent: /demo/i }],
  });
  console.log(`Deleted ${delLookups.deletedCount} lookups containing 'demo'.`);

  // 2. Remove users with "demo" or dummy domains
  const delUsers = await userCol.deleteMany({
    $or: [{ name: /demo/i }, { email: /demo/i }, { email: /example\.test/i }],
  });
  console.log(`Deleted ${delUsers.deletedCount} demo users.`);

  // 3. Ensure Manufacturing Locations exist
  await lookupCol.updateOne(
    { list: 'manufacturingLocation', value: 'Inhouse' },
    { $set: { list: 'manufacturingLocation', value: 'Inhouse', order: 1, active: true } },
    { upsert: true }
  );
  await lookupCol.updateOne(
    { list: 'manufacturingLocation', value: 'CMO' },
    { $set: { list: 'manufacturingLocation', value: 'CMO', order: 2, active: true } },
    { upsert: true }
  );

  // 4. Upsert CMO location details
  let order = 10;
  for (const cmo of CMO_LOCATIONS) {
    const res = await lookupCol.updateOne(
      { list: 'locationDetail', parent: 'CMO', value: cmo },
      {
        $set: {
          list: 'locationDetail',
          parent: 'CMO',
          value: cmo,
          order: order++,
          active: true,
        },
      },
      { upsert: true }
    );
    console.log(`Synced CMO location: ${cmo}`);
  }

  console.log('\nAll 20 CMO dropdown options successfully synced!');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error syncing:', err);
  process.exit(1);
});
