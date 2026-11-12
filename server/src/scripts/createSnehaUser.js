import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { User, Department } from '../models/index.js';

async function main() {
  try {
    await connectDatabase();
    console.log('Connected to database.');

    const email = 'sneha@simpel.ai'.toLowerCase();
    let dept = await Department.findOne({ code: 'QA' });
    if (!dept) {
      dept = await Department.findOne();
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name: 'Sneha Test',
        email,
        employeeId: 'EMP-SNEHA-01',
        designation: 'Quality Coordinator',
        department: dept ? dept._id : undefined,
        roles: ['admin', 'quality_coordinator', 'complaint_handler', 'frp', 'employee'],
        mustChangePassword: false,
        isActive: true,
      });
      await user.setPassword('Password123');
      await user.save();
      console.log(`Created new user: ${user.name} (${user.email})`);
    } else {
      user.name = 'Sneha Test';
      user.isActive = true;
      user.mustChangePassword = false;
      user.roles = ['admin', 'quality_coordinator', 'complaint_handler', 'frp', 'employee'];
      if (dept && !user.department) user.department = dept._id;
      await user.setPassword('Password123');
      await user.save();
      console.log(`Updated existing user: ${user.name} (${user.email})`);
    }

    console.log('User details:');
    console.log({
      id: user._id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      isActive: user.isActive,
      initialPassword: 'Password123',
    });
  } catch (err) {
    console.error('Error creating user:', err);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();

