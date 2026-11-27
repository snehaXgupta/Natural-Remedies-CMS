import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Node SRV DNS lookup on Windows
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const ATLAS_URI = 'mongodb+srv://cmsadmin:password123sneha@serverpanelcluster0.rirs7s4.mongodb.net/sfa_cms?retryWrites=true&w=majority';
const LOCAL_URI = 'mongodb://127.0.0.1:27017/sfa_cms?replicaSet=rs0';

async function updateDb(uri, label) {
  try {
    console.log(`Connecting to ${label}...`);
    const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
    console.log(`Connected to ${label}!`);
    const col = conn.collection('complaints');
    const complaints = await col.find({}).toArray();
    console.log(`${label} total complaints:`, complaints.length);

    // Distribution matching Salesforce target:
    // CMO (10 complaints):
    // Shamanur pharma-3033: 4
    // JCK-3004: 2
    // Harshavardhan-4200: 2
    // Indus spray-3003: 1
    // Venkat pharma-3007: 1
    //
    // Inhouse (11 complaints):
    // NRPL-Bangalore-1100: 4
    // NLPL- Pithampur Indore-70...: 4
    // NRPL-Anniyalam-AHP-2000: 2
    // NRPL-Anniyalam-HHP-2100: 1

    const cmoMapping = {
      'AHP-26-11-009': { loc: 'CMO', detail: 'Venkat pharma-3007' },
      'AHP-26-11-010': { loc: 'CMO', detail: 'Shamanur pharma-3033' },
      'AHP-26-11-011': { loc: 'CMO', detail: 'Shamanur pharma-3033' },
      'AHP-26-11-012': { loc: 'CMO', detail: 'Shamanur pharma-3033' },
      'AHP-26-11-013': { loc: 'CMO', detail: 'Shamanur pharma-3033' },
      'AHP-26-11-014': { loc: 'CMO', detail: 'JCK-3004' },
      'AHP-26-11-016': { loc: 'CMO', detail: 'JCK-3004' },
      'AHP-26-11-017': { loc: 'CMO', detail: 'Harshavardhan-4200' },
      'AHP-26-11-018': { loc: 'CMO', detail: 'Harshavardhan-4200' },
      'AHP-26-11-019': { loc: 'CMO', detail: 'Indus spray-3003' },
    };

    const inhouseMapping = {
      'AHP-26-11-001': { loc: 'Inhouse', detail: 'NRPL-Bangalore-1100' },
      'AHP-26-11-002': { loc: 'Inhouse', detail: 'NRPL-Bangalore-1100' },
      'AHP-26-11-008': { loc: 'Inhouse', detail: 'NRPL-Bangalore-1100' },
      'AHP-26-11-021': { loc: 'Inhouse', detail: 'NRPL-Bangalore-1100' },
      'AHP-26-11-003': { loc: 'Inhouse', detail: 'NRPL-Anniyalam-AHP-2000' },
      'AHP-26-11-007': { loc: 'Inhouse', detail: 'NRPL-Anniyalam-AHP-2000' },
      'AHP-26-11-004': { loc: 'Inhouse', detail: 'NLPL- Pithampur Indore-70...' },
      'AHP-26-11-005': { loc: 'Inhouse', detail: 'NLPL- Pithampur Indore-70...' },
      'AHP-26-11-006': { loc: 'Inhouse', detail: 'NLPL- Pithampur Indore-70...' },
      'AHP-26-11-020': { loc: 'Inhouse', detail: 'NLPL- Pithampur Indore-70...' },
      'AHP-26-11-015': { loc: 'Inhouse', detail: 'NRPL-Anniyalam-HHP-2100' },
    };

    for (const [no, data] of Object.entries({ ...cmoMapping, ...inhouseMapping })) {
      const res = await col.updateOne(
        { complaintNumber: no },
        {
          $set: {
            manufacturingLocation: data.loc,
            locationDetail: data.detail,
            'd2.investigation.manufacturingLocation': data.loc,
            'd2.investigation.locationDetail': data.detail,
            'd2.manufacturingLocation': data.loc,
            'd2.locationDetail': data.detail,
            sbu: 'AHP - Rumicare',
          },
        }
      );
      console.log(`Updated ${no} -> ${data.loc} / ${data.detail} (matched: ${res.matchedCount})`);
    }

    await conn.close();
  } catch (err) {
    console.error(`Error on ${label}:`, err.message);
  }
}

async function main() {
  await updateDb(ATLAS_URI, 'MongoDB Atlas');
  await updateDb(LOCAL_URI, 'Local MongoDB');
  process.exit(0);
}

main();
