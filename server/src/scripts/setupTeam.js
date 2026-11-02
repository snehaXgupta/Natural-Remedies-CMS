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

  console.log('Departments verified: QA, PROD');

  // 1. Create Managers first (Ramesh & Narayan)
  // Ramesh: Handler Manager
  let ramesh = await User.findOne({ email: 'ramesh@naturalremedies.com' });
  if (!ramesh) {
    ramesh = new User({
      name: 'Ramesh',
      email: 'ramesh@naturalremedies.com',
      designation: 'QA Head / Handler Manager',
      roles: ['reviewer', 'admin', 'employee'],
      department: qaDept._id,
      isActive: true,
      mustChangePassword: false,
    });
    await ramesh.setPassword(adminPassword);
    await ramesh.save();
    console.log('Created Handler Manager: Ramesh (ramesh@naturalremedies.com)');
  } else {
    ramesh.name = 'Ramesh';
    ramesh.designation = 'QA Head / Handler Manager';
    ramesh.roles = ['reviewer', 'admin', 'employee'];
    ramesh.department = qaDept._id;
    await ramesh.save();
    console.log('Updated Handler Manager: Ramesh');
  }

  // Set Ramesh as QA Department Manager
  await Department.updateOne({ _id: qaDept._id }, { $set: { manager: ramesh._id } });

  // Narayan: FRP Manager
  let narayan = await User.findOne({ email: 'narayan@naturalremedies.com' });
  if (!narayan) {
    narayan = new User({
      name: 'Narayan',
      email: 'narayan@naturalremedies.com',
      designation: 'Production Head / FRP Manager',
      roles: ['reviewer', 'employee'],
      department: prodDept._id,
      isActive: true,
      mustChangePassword: false,
    });
    await narayan.setPassword(adminPassword);
    await narayan.save();
    console.log('Created FRP Manager: Narayan (narayan@naturalremedies.com)');
  } else {
    narayan.name = 'Narayan';
    narayan.designation = 'Production Head / FRP Manager';
    narayan.roles = ['reviewer', 'employee'];
    narayan.department = prodDept._id;
    await narayan.save();
    console.log('Updated FRP Manager: Narayan');
  }

  // Set Narayan as Production Department Manager
  await Department.updateOne({ _id: prodDept._id }, { $set: { manager: narayan._id } });

  // 2. Create Pooja (Complaint Handler) -> Database Mapped to Ramesh
  let pooja = await User.findOne({ email: 'pooja@naturalremedies.com' });
  if (!pooja) {
    pooja = new User({
      name: 'Pooja',
      email: 'pooja@naturalremedies.com',
      designation: 'Quality Coordinator / Complaint Handler',
      roles: ['quality_coordinator', 'employee'],
      department: qaDept._id,
      manager: ramesh._id, // Database mapped to Handler Manager (Ramesh)
      isActive: true,
      mustChangePassword: false,
    });
    await pooja.setPassword(adminPassword);
    await pooja.save();
    console.log('Created Complaint Handler: Pooja (pooja@naturalremedies.com) -> Mapped to Manager: Ramesh');
  } else {
    pooja.name = 'Pooja';
    pooja.designation = 'Quality Coordinator / Complaint Handler';
    pooja.roles = ['quality_coordinator', 'employee'];
    pooja.manager = ramesh._id;
    pooja.department = qaDept._id;
    await pooja.save();
    console.log('Updated Complaint Handler: Pooja -> Mapped to Manager: Ramesh');
  }

  // 3. Create Naveen (FRP) -> Database Mapped to Narayan
  let naveen = await User.findOne({ email: 'naveen@naturalremedies.com' });
  if (!naveen) {
    naveen = new User({
      name: 'Naveen',
      email: 'naveen@naturalremedies.com',
      designation: 'Production Officer / First Responsible Person (FRP)',
      roles: ['frp', 'employee'],
      department: prodDept._id,
      manager: narayan._id, // Database mapped to FRP Manager (Narayan)
      isActive: true,
      mustChangePassword: false,
    });
    await naveen.setPassword(adminPassword);
    await naveen.save();
    console.log('Created FRP: Naveen (naveen@naturalremedies.com) -> Mapped to Manager: Narayan');
  } else {
    naveen.name = 'Naveen';
    naveen.designation = 'Production Officer / First Responsible Person (FRP)';
    naveen.roles = ['frp', 'employee'];
    naveen.manager = narayan._id;
    naveen.department = prodDept._id;
    await naveen.save();
    console.log('Updated FRP: Naveen -> Mapped to Manager: Narayan');
  }

  // 4. Create Sivakumar (Responsible Person - System Selection)
  let sivakumar = await User.findOne({ email: 'sivakumar@naturalremedies.com' });
  if (!sivakumar) {
    sivakumar = new User({
      name: 'Sivakumar',
      email: 'sivakumar@naturalremedies.com',
      designation: 'Maintenance & Engineering / Responsible Person',
      roles: ['employee'],
      department: prodDept._id,
      isActive: true,
      mustChangePassword: false,
    });
    await sivakumar.setPassword(adminPassword);
    await sivakumar.save();
    console.log('Created Responsible Person: Sivakumar (sivakumar@naturalremedies.com)');
  } else {
    sivakumar.name = 'Sivakumar';
    sivakumar.designation = 'Maintenance & Engineering / Responsible Person';
    sivakumar.roles = ['employee'];
    sivakumar.department = prodDept._id;
    await sivakumar.save();
    console.log('Updated Responsible Person: Sivakumar');
  }

  // Summary
  console.log('\n=== TEAM CONFIGURATION SUMMARY ===');
  console.log('1. Complaint Handler (Database Mapped)     : Pooja (pooja@naturalremedies.com)');
  console.log('2. Handler Manager (Database Mapped)       : Ramesh (ramesh@naturalremedies.com) [Pooja.manager]');
  console.log('3. FRP (System Selection)                  : Naveen (naveen@naturalremedies.com)');
  console.log('4. FRP Manager (Database Mapped)           : Narayan (narayan@naturalremedies.com) [Naveen.manager]');
  console.log('5. Responsible Person (System Selection)   : Sivakumar (sivakumar@naturalremedies.com)');
  console.log('All passwords: ' + adminPassword);

  await disconnectDatabase();
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});

