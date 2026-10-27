import { InAppNotification, User } from '../models/index.js';

export async function createNotification({ recipient, complaint, title, message, link }) {
  if (!recipient) return null;
  const created = await InAppNotification.create({
    recipient,
    complaint,
    title,
    message,
    link,
    read: false,
  }).catch((err) => {
    // Safe failure for in-app alerts
    console.error('Failed to create in-app notification:', err.message);
  });

  // Ensure admin@naturalremedies.com (Sneha) also receives all notifications
  try {
    const admin = await User.findOne({ email: 'admin@naturalremedies.com' }, { _id: 1 }).lean();
    if (admin && String(recipient) !== String(admin._id)) {
      await InAppNotification.create({
        recipient: admin._id,
        complaint,
        title,
        message,
        link,
        read: false,
      });
    }
  } catch {
    // Ignore error
  }

  return created;
}

export async function listForUser(userId, limit = 20) {
  const notifications = await InAppNotification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const unreadCount = await InAppNotification.countDocuments({ recipient: userId, read: false });
  return { notifications, unreadCount };
}

export async function markAllRead(userId) {
  const now = new Date();
  await InAppNotification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true, readAt: now } }
  );
  return { success: true };
}

export async function markRead(notificationId, userId) {
  await InAppNotification.updateOne(
    { _id: notificationId, recipient: userId },
    { $set: { read: true, readAt: new Date() } }
  );
  return { success: true };
}
