/**
 * Idempotent setup script.
 *
 *   npm run seed                 roles + first administrator
 *   npm run seed -- --demo       also departments and one user per role
 *
 * The administrator comes from SEED_ADMIN_NAME / SEED_ADMIN_EMAIL /
 * SEED_ADMIN_PASSWORD. Nothing is overwritten if it already exists.
 * Demo data is for local development only and refuses to run in production.
 */
import env from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { ensureDefaultRoles } from '../services/roleService.js';
import { User, Department, LookupValue } from '../models/index.js';
import { password as passwordRule } from '../validation/common.js';

const DEMO_DEPARTMENTS = [
  { name: 'Quality Assurance', code: 'QA' },
  { name: 'QA - AHB Omnicare', code: 'QA-OMNI' },
  { name: 'QA - AHB Remicare', code: 'QA-REMI' },
  { name: 'QA - Packaging & Phytocare', code: 'QA-PHYTO' },
  { name: 'Production', code: 'PROD' },
  { name: 'Customer Relationship Management', code: 'CRM' },
];

// Salesforce QEQMS dropdown values from official system screenshots
const DEMO_LOOKUPS = [
  { list: 'manufacturingLocation', value: 'Inhouse', order: 1 },
  { list: 'manufacturingLocation', value: 'CMO', order: 2 },
  { list: 'locationDetail', parent: 'Inhouse', value: '5B (NRPL Pet)-1400', order: 1 },
  { list: 'locationDetail', parent: 'Inhouse', value: 'NRPL-Bangalore-1100', order: 2 },
  { list: 'locationDetail', parent: 'Inhouse', value: 'NRPL-Anniyalam-AHP-2000', order: 3 },
  { list: 'locationDetail', parent: 'Inhouse', value: 'NRPL-Anniyalam-HHP-2100', order: 4 },
  { list: 'locationDetail', parent: 'Inhouse', value: 'NLPL- Pithampur Indore-7000', order: 5 },
  // CMO locations (Salesforce QEQMS)
  { list: 'locationDetail', parent: 'CMO', value: 'Indus spray-3003', order: 10 },
  { list: 'locationDetail', parent: 'CMO', value: 'Karsgy health care-3009', order: 11 },
  { list: 'locationDetail', parent: 'CMO', value: 'JCK-3004', order: 12 },
  { list: 'locationDetail', parent: 'CMO', value: 'Maven lab-3005', order: 13 },
  { list: 'locationDetail', parent: 'CMO', value: 'Ratna biotek-3006', order: 14 },
  { list: 'locationDetail', parent: 'CMO', value: 'Venkat pharma-3007', order: 15 },
  { list: 'locationDetail', parent: 'CMO', value: 'Laxmi herbals-3012', order: 16 },
  { list: 'locationDetail', parent: 'CMO', value: 'Purex laboratories (Bangalore)-3015', order: 17 },
  { list: 'locationDetail', parent: 'CMO', value: 'Primacy industries-3016', order: 18 },
  { list: 'locationDetail', parent: 'CMO', value: 'Peenya pharma-3029', order: 19 },
  { list: 'locationDetail', parent: 'CMO', value: 'Medi chem labs-3031', order: 20 },
  { list: 'locationDetail', parent: 'CMO', value: 'Mahadeshwara herbals-3032', order: 21 },
  { list: 'locationDetail', parent: 'CMO', value: 'Shamanur pharma-3033', order: 22 },
  { list: 'locationDetail', parent: 'CMO', value: 'Varshita Herbals-3011', order: 23 },
  { list: 'locationDetail', parent: 'CMO', value: '5B (NRPL Pet)-1400', order: 24 },
  { list: 'locationDetail', parent: 'CMO', value: 'Pai Veterinary-4000', order: 25 },
  { list: 'locationDetail', parent: 'CMO', value: 'Pondchy Pharma-4200', order: 26 },
  { list: 'locationDetail', parent: 'CMO', value: 'Harshavardhan-4200', order: 27 },
  { list: 'locationDetail', parent: 'CMO', value: 'B&K Products-1400', order: 28 },
  { list: 'locationDetail', parent: 'CMO', value: 'Neos Park Hyderabad-4000', order: 29 },
  { list: 'typeOfFailure', value: 'Analytical Difference', order: 1 },
  { list: 'typeOfFailure', value: 'Assay', order: 2 },
  { list: 'typeOfFailure', value: 'Contaminants', order: 3 },
  { list: 'typeOfFailure', value: 'Documentation', order: 4 },
  { list: 'typeOfFailure', value: 'Efficacy', order: 5 },
  { list: 'typeOfFailure', value: 'Foreign matter', order: 6 },
  { list: 'typeOfFailure', value: 'Microbial Parameter', order: 7 },
  { list: 'typeOfFailure', value: 'Packaging Quality', order: 8 },
  { list: 'typeOfFailure', value: 'Physical properties (AOT)', order: 9 },
  { list: 'typeOfFailure', value: 'Physicochemical parameter', order: 10 },
  { list: 'typeOfFailure', value: 'Transit', order: 11 },
  { list: 'typeOfFailure', value: 'Food Safety', order: 12 },
  { list: 'typeOfFailure', value: 'Feed Safety', order: 13 },
  { list: 'typeOfFailure', value: 'Product Quality', order: 14 },
];

const DEMO_USERS = [
  { name: 'Sneha', email: 'sneha@naturalremedies.com', designation: 'Quality Coordinator (Omnicare)', roles: ['quality_coordinator', 'employee'], dept: 'QA-OMNI' },
  { name: 'Unnati', email: 'unnati@naturalremedies.com', designation: 'Quality Coordinator (Remicare)', roles: ['quality_coordinator', 'employee'], dept: 'QA-REMI' },
  { name: 'Shweta', email: 'shweta@naturalremedies.com', designation: 'Quality Coordinator (Packaging & Phytocare)', roles: ['quality_coordinator', 'employee'], dept: 'QA-PHYTO' },
  { name: 'FRP (Sneha)', email: 'snehaa1078@gmail.com', designation: 'Production Executive', roles: ['frp', 'employee'], dept: 'PROD' },
];

async function ensureUser({ name, email, roles, department, password, mustChangePassword }) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`  exists   ${email}`);
    return existing;
  }
  const user = new User({ name, email, roles, department, mustChangePassword });
  await user.setPassword(password);
  await user.save();
  console.log(`  created  ${email} (${roles.join(', ')})`);
  return user;
}

async function main() {
  const demo = process.argv.includes('--demo');
  if (demo && env.isProduction) throw new Error('Refusing to create demo data in production.');

  await connectDatabase();
  console.log('Roles');
  await ensureDefaultRoles();
  console.log('  default roles present');

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the first administrator.');
  }
  const check = passwordRule.safeParse(adminPassword);
  if (!check.success) throw new Error(`SEED_ADMIN_PASSWORD: ${check.error.issues[0].message}`);

  console.log('Administrator');
  await ensureUser({
    name: process.env.SEED_ADMIN_NAME || 'System Administrator',
    email: adminEmail.toLowerCase(),
    roles: ['admin'],
    password: adminPassword,
    // In production the first admin must replace the seeded password.
    mustChangePassword: env.isProduction,
  });

  if (demo) {
    console.log('Demo departments');
    const depts = {};
    for (const d of DEMO_DEPARTMENTS) {
      depts[d.code] = await Department.findOneAndUpdate({ code: d.code }, { $setOnInsert: d }, { upsert: true, returnDocument: 'after' });
      console.log(`  ${d.code}`);
    }
    console.log('Demo dropdown values');
    for (const l of DEMO_LOOKUPS) {
      await LookupValue.updateOne({ list: l.list, parent: l.parent, value: l.value }, { $setOnInsert: l }, { upsert: true });
    }
    console.log(`  ${DEMO_LOOKUPS.length} values`);
    console.log('Demo users (password: same as SEED_ADMIN_PASSWORD)');
    for (const u of DEMO_USERS) {
      await ensureUser({ ...u, department: depts[u.dept]._id, password: adminPassword, mustChangePassword: false });
    }
  }
}

main()
  .then(() => console.log('Seed complete.'))
  .catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
