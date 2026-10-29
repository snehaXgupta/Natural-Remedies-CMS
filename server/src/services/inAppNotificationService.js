import { InAppNotification, User } from '../models/index.js';

export async function createNotification({ recipient, complaint, title, message, link }) {
  if (!recipient) return null;

  // 1. Deduplication guard: do not create duplicate notification for the same recipient
  // with identical complaint and title within 5 minutes.
  const windowTime = new Date(Date.now() - 5 * 60 * 1000);
  try {
    const existing = await InAppNotification.findOne({
      recipient,
      complaint: complaint || null,
      title,
      createdAt: { $gte: windowTime },
    }).lean();

    if (existing) {
      return existing;
    }
  } catch (err) {
    // Continue if find fails
  }

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

  // Ensure admin@naturalremedies.com (Sneha) also receives notifications for system oversight,
  // but only if admin hasn't already received this notification recently.
  try {
    const admin = await User.findOne({ email: 'admin@naturalremedies.com' }, { _id: 1 }).lean();
    if (admin && String(recipient) !== String(admin._id)) {
      const existingAdmin = await InAppNotification.findOne({
        recipient: admin._id,
        complaint: complaint || null,
        title,
        createdAt: { $gte: windowTime },
      }).lean();

      if (!existingAdmin) {
        await InAppNotification.create({
          recipient: admin._id,
          complaint,
          title,
          message,
          link,
          read: false,
        });
      }
    }
  } catch {
    // Ignore error
  }

  return created;
}

export async function cleanupDuplicatesForUser(userId) {
  try {
    const list = await InAppNotification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const seen = new Set();
    const idsToDelete = [];

    for (const item of list) {
      // Group by complaint, title, message and a 15-minute time window
      const timeBucket = Math.floor(new Date(item.createdAt).getTime() / (15 * 60 * 1000));
      const key = `${item.complaint || ''}_${item.title}_${item.message}_${timeBucket}`;
      if (seen.has(key)) {
        idsToDelete.push(item._id);
      } else {
        seen.add(key);
      }
    }

    if (idsToDelete.length > 0) {
      await InAppNotification.deleteMany({ _id: { $in: idsToDelete } });
    }
  } catch (err) {
    console.error('Failed to cleanup duplicate notifications:', err.message);
  }
}

export async function listForUser(userId, limit = 20) {
  await cleanupDuplicatesForUser(userId);
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
