import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/index.js';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sfa_cms?replicaSet=rs0';

async function main() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const admin = await User.findOne({ email: 'admin@naturalremedies.com' });
  if (admin) {
    admin.name = 'Sneha';
    admin.designation = 'Complaint Handler / Admin';
    if (!admin.roles.includes('quality_coordinator')) {
      admin.roles.push('quality_coordinator');
    }
    if (!admin.roles.includes('employee')) {
      admin.roles.push('employee');
    }
    await admin.save();
    console.log('Updated admin@naturalremedies.com successfully:', {
      name: admin.name,
      email: admin.email,
      roles: admin.roles,
      designation: admin.designation,
    });
  } else {
    console.log('admin@naturalremedies.com not found');
  }

  await mongoose.disconnect();
}

main().catch(console.error);
