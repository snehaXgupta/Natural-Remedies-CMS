import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Zap } from 'lucide-react';
import { inAppApi } from '../api/endpoints.js';

function formatRelativeTime(dateString) {
  if (!dateString) return 'just now';
  const diffSec = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  return `${Math.floor(diffSec / 86400)} days ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const containerRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await inAppApi.list();
      setData(res.data || { notifications: [], unreadCount: 0 });
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAllRead = async () => {
    try {
      await inAppApi.markAllRead();
      setData((prev) => ({
        ...prev,
        unreadCount: 0,
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
      }));
    } catch {
      // Ignore
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      inAppApi.markRead(notif._id).catch(() => {});
      setData((prev) => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1),
        notifications: prev.notifications.map((n) => (n._id === notif._id ? { ...n, read: true } : n)),
      }));
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {data.unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0176d3] px-1 text-[10px] font-bold text-white shadow-xs">
            {data.unreadCount > 9 ? '9+' : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2.5 w-80 sm:w-96 rounded-md border border-slate-300 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-100">
          {/* Salesforce popover caret pointing directly up to the bell icon */}
          <div className="absolute -top-[9px] right-3 h-0 w-0 border-x-[8px] border-x-transparent border-b-[9px] border-b-slate-300 pointer-events-none" />
          <div className="absolute -top-[7.5px] right-3 h-0 w-0 border-x-[8px] border-x-transparent border-b-[8px] border-b-white pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-white rounded-t-md">
            <h3 className="text-sm font-semibold text-slate-700">Notifications</h3>
            {data.notifications.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-normal text-[#0176d3] hover:underline flex items-center gap-1"
              >
                Mark all as read <span className="text-slate-400 font-bold ml-0.5">✕</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {data.notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No notifications right now
              </div>
            ) : (
              data.notifications.map((n) => (
                <Link
                  key={n._id}
                  to={n.link || '#'}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-3 p-3.5 transition hover:bg-slate-50/80 ${
                    !n.read ? 'bg-blue-50/30' : 'bg-white'
                  }`}
                >
                  {/* Lightning blue square badge from screenshot */}
                  <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded bg-[#0176d3] text-white shadow-2xs mt-0.5">
                    <Zap className="h-4 w-4 fill-white text-white" />
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-snug">
                      {n.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>{formatRelativeTime(n.createdAt)}</span>
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 inline-block" />
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
