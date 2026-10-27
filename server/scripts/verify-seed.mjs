import mongoose from 'mongoose';

async function verify() {
  await mongoose.connect('mongodb://127.0.0.1:27017/sfa_cms?replicaSet=rs0');
  const db = mongoose.connection.db;

  console.log('--- Database Collections & Record Counts ---');
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`• ${col.name}: ${count} record(s)`);
  }

  console.log('\n--- Seeded Users ---');
  const users = await db.collection('users').find({}, { projection: { name: 1, email: 1, roles: 1, isActive: 1 } }).toArray();
  for (const u of users) {
    console.log(`• ${u.name} | ${u.email} | Roles: [${u.roles.join(', ')}] | Active: ${u.isActive}`);
  }

  console.log('\n--- Roles Configured ---');
  const roles = await db.collection('roles').find({}, { projection: { name: 1, key: 1, permissions: 1 } }).toArray();
  for (const r of roles) {
    console.log(`• ${r.name} (${r.key}): ${r.permissions.length} permission(s)`);
  }

  console.log('\n--- Departments ---');
  const depts = await db.collection('departments').find({}).toArray();
  for (const d of depts) {
    console.log(`• ${d.name} (${d.code})`);
  }

  console.log('\n--- Lookup Dropdowns ---');
  const lookups = await db.collection('lookupvalues').find({}).toArray();
  for (const l of lookups) {
    console.log(`• [${l.list}] ${l.value}${l.parent ? ` (Parent: ${l.parent})` : ''}`);
  }

  const complaintsCount = await db.collection('complaints').countDocuments();
  console.log(`\n--- Complaints in System ---`);
  console.log(`• Total Complaints: ${complaintsCount}`);

  await mongoose.disconnect();
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
