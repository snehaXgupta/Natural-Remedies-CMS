import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { LookupValue } from '../models/index.js';
import { DEFAULT_LOOKUPS } from '../services/lookupService.js';

async function main() {
  await connectDatabase();
  console.log('Connected to database.');

  let inserted = 0;
  let updated = 0;

  for (const item of DEFAULT_LOOKUPS) {
    const filter = {
      list: item.list,
      value: item.value,
      ...(item.parent !== undefined ? { parent: item.parent } : {}),
    };

    const res = await LookupValue.findOneAndUpdate(
      filter,
      {
        $set: {
          active: true,
          order: item.order || 0,
          parent: item.parent || null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[Synced] ${item.list} -> ${item.value} ${item.parent ? `(parent: ${item.parent})` : ''}`);
    updated++;
  }

  console.log(`Successfully synced ${updated} D2 picklist options into MongoDB.`);
  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Error updating D2 lookups:', err);
  process.exit(1);
});

