import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Department } from '../src/models/index.js';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sfa_cms?replicaSet=rs0';

async function main() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // 1. Ensure departments for different SBUs exist
  const deptsConfig = [
    { name: 'QA - AHB Omnicare', code: 'QA-OMNI' },
    { name: 'QA - AHB Remicare', code: 'QA-REMI' },
    { name: 'QA - Packaging & Phytocare', code: 'QA-PHYTO' },
  ];

  const deptMap = {};
  for (const d of deptsConfig) {
    let dept = await Department.findOne({ code: d.code });
    if (!dept) {
      dept = await Department.create(d);
      console.log(`Created department: ${dept.name} (${dept.code})`);
    } else {
      dept.name = d.name;
      dept.isActive = true;
      await dept.save();
      console.log(`Updated department: ${dept.name}`);
    }
    deptMap[d.code] = dept._id;
  }

  // 2. Feed the coordinators: Jensy Josephine, Sneha, Unnati, Shweta
  const coordinators = [
    {
      name: 'Jensy Josephine',
      email: 'josephine.j@naturalremedy.com',
      employeeId: 'NR-QA-0100',
      phone: '09876543321',
      designation: 'Complaint Handler / Quality Coordinator',
      department: deptMap['QA-OMNI'],
      roles: ['quality_coordinator', 'employee'],
    },
    {
      name: 'Sneha',
      email: 'sneha@naturalremedies.com',
      employeeId: 'NR-QA-0101',
      phone: '+91 98765 43210',
      designation: 'Quality Coordinator (Omnicare)',
      department: deptMap['QA-OMNI'],
      roles: ['quality_coordinator', 'employee'],
    },
    {
      name: 'Unnati',
      email: 'unnati@naturalremedies.com',
      employeeId: 'NR-QA-0102',
      phone: '+91 98765 43211',
      designation: 'Quality Coordinator (Remicare)',
      department: deptMap['QA-REMI'],
      roles: ['quality_coordinator', 'employee'],
    },
    {
      name: 'Shweta',
      email: 'shweta@naturalremedies.com',
      employeeId: 'NR-QA-0103',
      phone: '+91 98765 43212',
      designation: 'Quality Coordinator (Packaging & Phytocare)',
      department: deptMap['QA-PHYTO'],
      roles: ['quality_coordinator', 'employee'],
    },
  ];

  for (const c of coordinators) {
    let user = await User.findOne({ email: c.email });
    if (!user) {
      user = new User(c);
      await user.setPassword('Coordinator123!');
      user.mustChangePassword = false;
      user.isActive = true;
      await user.save();
      console.log(`Created coordinator: ${user.name} <${user.email}>`);
    } else {
      user.name = c.name;
      user.department = c.department;
      user.designation = c.designation;
      user.employeeId = c.employeeId;
      user.roles = c.roles;
      user.isActive = true;
      user.mustChangePassword = false;
      await user.save();
      console.log(`Updated coordinator: ${user.name} <${user.email}>`);
    }
  }

  console.log('Successfully seeded coordinators!');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error seeding coordinators:', err);
  process.exit(1);
});
