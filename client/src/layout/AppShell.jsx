import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  Menu,
  LogOut,
  KeyRound,
  X,
  ChevronDown,
  Search,
  Star,
  Plus,
  HelpCircle,
  Grid,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { NotificationBell } from '../components/NotificationBell.jsx';

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.key === 'Escape' || e.type === 'mousedown') setOpen(false);
    };
    window.addEventListener('keydown', close);
    window.addEventListener('mousedown', close);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('mousedown', close);
    };
  }, [open]);

  return (
    <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded px-2 py-1 text-slate-700 hover:bg-slate-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white shadow-sm">
          {initials}
        </span>
        <span className="hidden text-xs font-medium text-slate-700 sm:block">
          Log out as <strong className="text-slate-900">{user.name}</strong>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-semibold text-slate-800">{user.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
          <NavLink role="menuitem" to="/account/password" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
            <KeyRound className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Change password
          </NavLink>
          <button role="menuitem" type="button" onClick={() => logout(false)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">
            <LogOut className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Sign out
          </button>
          <button role="menuitem" type="button" onClick={() => logout(true)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50">
            <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out on all devices
          </button>
        </div>
      )}
    </div>
  );
}

const EQMS_TABS = [
  { label: 'Complaints', to: '/complaints', hasDropdown: true },
  { label: 'Settings', to: '/settings', hasDropdown: true },
  { label: 'Change Control Requests', to: '#', hasDropdown: true },
  { label: 'Change Controls', to: '#', hasDropdown: true },
  { label: 'Chatter', to: '#', hasDropdown: false },
  { label: 'Reports', to: '/reports', hasDropdown: true },
  { label: 'Dashboards', to: '/', hasDropdown: true },
  { label: 'Deviations', to: '#', hasDropdown: true },
  { label: 'Deviation Request', to: '#', hasDropdown: true },
  { label: 'AuditPlans', to: '#', hasDropdown: true },
  { label: 'More', to: '#', hasDropdown: true },
];

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900 flex flex-col font-sans">
      {/* Salesforce Global Header (Top Utility Bar) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        {/* Top utility row */}
        <div className="flex h-11 items-center justify-between px-3 sm:px-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="rounded p-1 text-slate-600 hover:bg-slate-100 xl:hidden"
              aria-label="Toggle Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden sm:inline-block text-[11px] font-medium text-slate-400">
              Natural Remedies
            </span>
          </div>

          {/* Centered Global Search */}
          <div className="relative w-72 sm:w-96 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search complaints, products, batch..."
              className="h-8 w-full rounded-full border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <button type="button" className="hidden sm:flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-amber-500" title="Favorites">
              <Star className="h-3.5 w-3.5" />
            </button>
            <Link to="/complaints" className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50" title="Global Actions">
              <Plus className="h-3.5 w-3.5" />
            </Link>
            <button type="button" className="hidden sm:flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50" title="Help">
              <HelpCircle className="h-3.5 w-3.5" />
            </button>

            {/* In-App Notifications Bell */}
            <NotificationBell />

            {/* User Profile */}
            <UserMenu />
          </div>
        </div>

        {/* Primary Salesforce Ribbon (Waffle + EQMS + Tabs exactly as shown in screenshot) */}
        <div className="flex h-11 items-center justify-between px-3 sm:px-5 bg-white overflow-x-auto no-scrollbar">
          <div className="flex items-center h-full">
            {/* 9-dot Waffle Icon */}
            <button type="button" className="flex items-center justify-center p-1.5 rounded hover:bg-slate-100 text-slate-700 mr-2" title="App Launcher">
              <svg className="h-4.5 w-4.5 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="4" cy="4" r="2" />
                <circle cx="10" cy="4" r="2" />
                <circle cx="16" cy="4" r="2" />
                <circle cx="4" cy="10" r="2" />
                <circle cx="10" cy="10" r="2" />
                <circle cx="16" cy="10" r="2" />
                <circle cx="4" cy="16" r="2" />
                <circle cx="10" cy="16" r="2" />
                <circle cx="16" cy="16" r="2" />
              </svg>
            </button>

            {/* EQMS Title */}
            <span className="font-bold tracking-tight text-slate-800 text-[15px] pr-4 border-r border-slate-200 mr-1 select-none">
              EQMS
            </span>

            {/* Tabs List */}
            <nav className="flex items-center h-full text-xs">
              {EQMS_TABS.map((tab) => {
                const isMatch = tab.to !== '#' && (tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to));
                return (
                  <NavLink
                    key={tab.label}
                    to={tab.to}
                    onClick={(e) => {
                      if (tab.to === '#') e.preventDefault();
                    }}
                    className={`inline-flex items-center gap-1 whitespace-nowrap h-full px-3 font-medium transition-colors border-b-2 -mb-[1px] ${
                      isMatch
                        ? 'border-blue-600 text-blue-700 bg-blue-50/70 font-semibold'
                        : 'border-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.hasDropdown && (
                      <ChevronDown className={`h-3 w-3 ${isMatch ? 'text-blue-600' : 'text-slate-400'}`} />
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Right edit pencil icon */}
          <button type="button" className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 shrink-0 ml-2" title="Edit Navigation Items">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
