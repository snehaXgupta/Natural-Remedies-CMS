import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { User, Department } from '../models/index.js';

async function setup() {
  await connectDatabase();
  console.log('Connected to MongoDB.');

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';

  // Remove the previous temporary users (Pooja, Ramesh, Naveen, Narayan, Sivakumar)
  const removed = await User.deleteMany({
    email: {
      $in: [
        'pooja@naturalremedies.com',
        'ramesh@naturalremedies.com',
        'naveen@naturalremedies.com',
        'narayan@naturalremedies.com',
        'sivakumar@naturalremedies.com',
      ],
    },
  });
  console.log(`Removed ${removed.deletedCount} previous temporary users.`);

  // Ensure Departments
  const qaDept = await Department.findOneAndUpdate(
    { code: 'QA' },
    { $setOnInsert: { name: 'Quality Assurance', code: 'QA' } },
    { upsert: true, returnDocument: 'after' }
  );

  const prodDept = await Department.findOneAndUpdate(
    { code: 'PROD' },
    { $setOnInsert: { name: 'Production & Manufacturing', code: 'PROD' } },
    { upsert: true, returnDocument: 'after' }
  );

  // 1. Create Thippeswamy: Both FRP Manager & Handler Manager
  let thippeswamy = await User.findOne({
    $or: [{ email: 'thippeswamy@naturalremedies.com' }, { name: /Thippeswamy/i }],
  });
  if (!thippeswamy) {
    thippeswamy = new User({
      name: 'Thippeswamy',
      email: 'thippeswamy@naturalremedies.com',
      designation: 'Manager (FRP Manager & Handler Manager)',
      roles: ['reviewer', 'admin', 'employee'],
      department: qaDept._id,
      isActive: true,
      mustChangePassword: false,
    });
    await thippeswamy.setPassword(adminPassword);
    await thippeswamy.save();
    console.log('Created Manager: Thippeswamy (thippeswamy@naturalremedies.com)');
  } else {
    thippeswamy.name = 'Thippeswamy';
    thippeswamy.email = 'thippeswamy@naturalremedies.com';
    thippeswamy.designation = 'Manager (FRP Manager & Handler Manager)';
    thippeswamy.roles = ['reviewer', 'admin', 'employee'];
    thippeswamy.department = qaDept._id;
    await thippeswamy.save();
    console.log('Updated Manager: Thippeswamy');
  }

  // Set Thippeswamy as Department Manager for all departments
  await Department.updateMany({}, { $set: { manager: thippeswamy._id } });
  // Remove Demo Reviewer with bad email if present
  await User.deleteMany({ email: /snehaagmail\.com/i });
  // Set Thippeswamy as default manager for any active employee without a manager
  await User.updateMany({ _id: { $ne: thippeswamy._id }, manager: null }, { $set: { manager: thippeswamy._id } });

  // 2. Create Chandan: Complaint Handler (Database Mapping -> Manager: Thippeswamy)
  let chandan = await User.findOne({
    $or: [{ email: 'chandan@naturalremedies.com' }, { name: /Chandan/i }],
  });
  if (!chandan) {
    chandan = new User({
      name: 'Chandan',
      email: 'chandan@naturalremedies.com',
      designation: 'Quality Coordinator / Complaint Handler',
      roles: ['quality_coordinator', 'employee'],
      department: qaDept._id,
      manager: thippeswamy._id, // Database mapped to Handler Manager (Thippeswamy)
      isActive: true,
      mustChangePassword: false,
    });
    await chandan.setPassword(adminPassword);
    await chandan.save();
    console.log('Created Complaint Handler: Chandan (chandan@naturalremedies.com) -> Mapped to Manager: Thippeswamy');
  } else {
    chandan.name = 'Chandan';
    chandan.email = 'chandan@naturalremedies.com';
    chandan.designation = 'Quality Coordinator / Complaint Handler';
    chandan.roles = ['quality_coordinator', 'employee'];
    chandan.manager = thippeswamy._id;
    chandan.department = qaDept._id;
    await chandan.save();
    console.log('Updated Complaint Handler: Chandan -> Mapped to Manager: Thippeswamy');
  }

  // 3. Create Shaikh Abdul K: FRP (System Selection -> Manager: Thippeswamy)
  let shaikh = await User.findOne({
    $or: [
      { email: 'shaikh.abdul.k@naturalremedies.com' },
      { email: 'shaikh.abdul@naturalremedies.com' },
      { name: /Shaikh\s*Abdul/i },
    ],
  });
  if (!shaikh) {
    shaikh = new User({
      name: 'Shaikh Abdul K',
      email: 'shaikh.abdul.k@naturalremedies.com',
      designation: 'Production Officer / First Responsible Person (FRP)',
      roles: ['frp', 'employee'],
      department: prodDept._id,
      manager: thippeswamy._id, // Database mapped to FRP Manager (Thippeswamy)
      isActive: true,
      mustChangePassword: false,
    });
    await shaikh.setPassword(adminPassword);
    await shaikh.save();
    console.log('Created FRP: Shaikh Abdul K (shaikh.abdul.k@naturalremedies.com) -> Mapped to Manager: Thippeswamy');
  } else {
    shaikh.name = 'Shaikh Abdul K';
    shaikh.email = 'shaikh.abdul.k@naturalremedies.com';
    shaikh.designation = 'Production Officer / First Responsible Person (FRP)';
    shaikh.roles = ['frp', 'employee'];
    shaikh.manager = thippeswamy._id;
    shaikh.department = prodDept._id;
    await shaikh.save();
    console.log('Updated FRP: Shaikh Abdul K -> Mapped to Manager: Thippeswamy');
  }

  // 4. Create Deepak: Responsible Person (System Selection)
  let deepak = await User.findOne({
    $or: [{ email: 'deepak@naturalremedies.com' }, { name: /Deepak/i }],
  });
  if (!deepak) {
    deepak = new User({
      name: 'Deepak',
      email: 'deepak@naturalremedies.com',
      designation: 'Maintenance & Engineering Lead / Responsible Person',
      roles: ['employee'],
      department: prodDept._id,
      isActive: true,
      mustChangePassword: false,
    });
    await deepak.setPassword(adminPassword);
    await deepak.save();
    console.log('Created Responsible Person: Deepak (deepak@naturalremedies.com)');
  } else {
    deepak.name = 'Deepak';
    deepak.email = 'deepak@naturalremedies.com';
    deepak.designation = 'Maintenance & Engineering Lead / Responsible Person';
    deepak.roles = ['employee'];
    deepak.department = prodDept._id;
    await deepak.save();
    console.log('Updated Responsible Person: Deepak');
  }

  console.log('\n=== UPDATED TEAM MAPPING SUMMARY ===');
  console.log('1. Handler (Database Mapping)              : Chandan (chandan@naturalremedies.com)');
  console.log('2. FRP (System Selection)                  : Shaikh Abdul K (shaikh.abdul.k@naturalremedies.com)');
  console.log('3. FRP Manager (Database Mapping)          : Thippeswamy (thippeswamy@naturalremedies.com)');
  console.log('4. Responsible Person (System Selection)   : Deepak (deepak@naturalremedies.com)');
  console.log('5. Handler Manager (Database Mapping)      : Thippeswamy (thippeswamy@naturalremedies.com)');
  console.log('All passwords: ' + adminPassword);

  await disconnectDatabase();
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
