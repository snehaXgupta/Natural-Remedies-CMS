import { useEffect, useState, useRef } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
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
  Loader2,
  Bookmark,
  Trash2,
  ExternalLink,
  FileText,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  BookOpen,
  Info,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { NotificationBell } from '../components/NotificationBell.jsx';
import { complaintApi } from '../api/endpoints.js';
import { NewComplaintModal } from '../pages/complaints/NewComplaintModal.jsx';

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

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
          Log out as <strong className="text-slate-900">{user?.name}</strong>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <NavLink
            role="menuitem"
            to="/account/password"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
          >
            <KeyRound className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Change password
          </NavLink>
          <button
            role="menuitem"
            type="button"
            onClick={() => logout(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Sign out
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => logout(true)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
          >
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
  const navigate = useNavigate();

  // 1. Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // 2. Favorites State
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nr_eqms_favorites') || '[]');
    } catch {
      return [];
    }
  });
  const favoritesRef = useRef(null);

  // 3. Global Actions State (+ button)
  const [actionsOpen, setActionsOpen] = useState(false);
  const [newComplaintModalOpen, setNewComplaintModalOpen] = useState(false);
  const actionsRef = useRef(null);

  // 4. Help Drawer State (? button)
  const [helpOpen, setHelpOpen] = useState(false);

  // Check if currently viewing a complaint detail page
  const complaintMatch = location.pathname.match(/^\/complaints\/([a-f0-9]{24})/i);
  const currentComplaintId = complaintMatch ? complaintMatch[1] : null;
  const isCurrentFavorite = favorites.some((f) => f.id === currentComplaintId);

  // Close menus on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setFavoritesOpen(false);
    setActionsOpen(false);
  }, [location.pathname]);

  // Click outside listener for popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (favoritesRef.current && !favoritesRef.current.contains(e.target)) {
        setFavoritesOpen(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener ('/' to search, 'Escape' to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setFavoritesOpen(false);
        setActionsOpen(false);
        setHelpOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live Search Effect
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await complaintApi.list({ search: q, limit: 6 });
        setSearchResults(res.data?.items || res.items || []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchOpen(false);
    navigate(`/complaints?search=${encodeURIComponent(q)}`);
  };

  // Toggle Favorite
  const toggleFavoriteCurrent = async () => {
    if (!currentComplaintId) return;
    if (isCurrentFavorite) {
      const updated = favorites.filter((f) => f.id !== currentComplaintId);
      setFavorites(updated);
      localStorage.setItem('nr_eqms_favorites', JSON.stringify(updated));
    } else {
      try {
        const res = await complaintApi.get(currentComplaintId);
        const c = res.data || res;
        const newFav = {
          id: c._id,
          number: c.complaintNumber,
          product: c.reportedProduct?.name || c.d2?.verifiedProduct?.productName || 'Complaint',
          stage: c.stage,
          date: new Date().toISOString(),
        };
        const updated = [newFav, ...favorites.filter((f) => f.id !== currentComplaintId)].slice(0, 15);
        setFavorites(updated);
        localStorage.setItem('nr_eqms_favorites', JSON.stringify(updated));
      } catch {
        // Fallback
      }
    }
  };

  const removeFavorite = (id, e) => {
    e.stopPropagation();
    const updated = favorites.filter((f) => f.id !== id);
    setFavorites(updated);
    localStorage.setItem('nr_eqms_favorites', JSON.stringify(updated));
  };

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

          {/* 1. Global Search Bar */}
          <div ref={searchRef} className="relative w-72 sm:w-96 max-w-md">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!searchOpen) setSearchOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) setSearchOpen(true);
                }}
                placeholder="Search complaints, products, batch... (/ to focus)"
                className="h-8 w-full rounded-full border border-slate-300 bg-slate-50 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>

            {/* Live Search Results Floating Dropdown */}
            {searchOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-md border border-slate-200 bg-white shadow-xl overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>Matching Complaints</span>
                  {searching && <Loader2 className="h-3 w-3 animate-spin text-blue-600" />}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {searching && searchResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">Searching complaints...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      No complaints found matching &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    searchResults.map((c) => (
                      <div
                        key={c._id}
                        onClick={() => {
                          navigate(`/complaints/${c._id}`);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="p-2.5 hover:bg-blue-50/60 cursor-pointer transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-600">{c.complaintNumber}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] text-slate-600 border border-slate-200">
                              {c.stage || 'D1'}
                            </span>
                            <span className="text-[10px] text-slate-400">{c.sbu}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 truncate mt-0.5">
                            {c.reportedProduct?.name || c.d2?.verifiedProduct?.productName || c.shortDescription || '—'}
                          </p>
                        </div>
                        <div className="text-right shrink-0 text-[11px] text-slate-400">
                          {c.reportedProduct?.batchNumber && (
                            <span className="block font-mono text-[10px] text-slate-600">
                              Batch: {c.reportedProduct.batchNumber}
                            </span>
                          )}
                          <span>{c.country || ''}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="w-full text-left bg-slate-50 hover:bg-slate-100 p-2 text-center text-[11px] font-semibold text-blue-600 border-t border-slate-200"
                  >
                    View all results for &quot;{searchQuery}&quot; in Complaints list &rarr;
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* 2. Star Icon (Favorites) */}
            <div ref={favoritesRef} className="relative">
              <button
                type="button"
                onClick={() => setFavoritesOpen((o) => !o)}
                className={`flex h-7 w-7 items-center justify-center rounded border transition-colors ${
                  isCurrentFavorite
                    ? 'border-amber-300 bg-amber-50 text-amber-500 hover:bg-amber-100'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-amber-500'
                }`}
                title="Favorites"
              >
                <Star className={`h-3.5 w-3.5 ${isCurrentFavorite ? 'fill-amber-500' : ''}`} />
              </button>

              {favoritesOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-md border border-slate-200 bg-white shadow-xl overflow-hidden text-xs animate-in fade-in duration-100">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-800">Favorites</span>
                    <span className="text-[10px] text-slate-500">{favorites.length} saved</span>
                  </div>

                  {currentComplaintId && (
                    <div className="p-2 border-b border-slate-100 bg-blue-50/50">
                      <button
                        type="button"
                        onClick={toggleFavoriteCurrent}
                        className="w-full text-left flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-white border border-blue-200 text-blue-700 font-semibold hover:bg-blue-100 transition-colors shadow-2xs"
                      >
                        <Star className={`h-3.5 w-3.5 ${isCurrentFavorite ? 'fill-amber-500 text-amber-500' : 'text-blue-600'}`} />
                        <span>{isCurrentFavorite ? 'Remove from Favorites' : 'Add Current Complaint to Favorites'}</span>
                      </button>
                    </div>
                  )}

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {favorites.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">
                        No favorites yet. Click the star while on any complaint record to bookmark it.
                      </div>
                    ) : (
                      favorites.map((fav) => (
                        <div
                          key={fav.id}
                          onClick={() => {
                            navigate(`/complaints/${fav.id}`);
                            setFavoritesOpen(false);
                          }}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 group"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-blue-600">{fav.number}</span>
                            <p className="text-[11px] text-slate-600 truncate mt-0.5">{fav.product}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => removeFavorite(fav.id, e)}
                            className="text-slate-300 hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Plus Icon (Global Actions) */}
            <div ref={actionsRef} className="relative">
              <button
                type="button"
                onClick={() => setActionsOpen((o) => !o)}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                title="Global Actions"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>

              {actionsOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-md border border-slate-200 bg-white shadow-xl overflow-hidden text-xs animate-in fade-in duration-100 py-1">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Global Quick Actions
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false);
                      setNewComplaintModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 font-medium"
                  >
                    <Plus className="h-4 w-4 text-blue-600" />
                    <span>New Complaint</span>
                  </button>
                  <Link
                    to="/whatsapp-simulator"
                    onClick={() => setActionsOpen(false)}
                    className="px-3 py-2 text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 font-medium"
                  >
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp Simulator</span>
                  </Link>
                  <Link
                    to="/reports"
                    onClick={() => setActionsOpen(false)}
                    className="px-3 py-2 text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 font-medium"
                  >
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span>Reports & Analytics</span>
                  </Link>
                </div>
              )}
            </div>

            {/* 4. Help Icon (? Process Guide Drawer) */}
            <div>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                title="Help & Process Guide"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* In-App Notifications Bell */}
            <NotificationBell />

            {/* User Profile */}
            <UserMenu />
          </div>
        </div>

        {/* Primary Salesforce Ribbon (Waffle + EQMS + Tabs) */}
        <div className="flex h-11 items-center justify-between px-3 sm:px-5 bg-white overflow-x-auto no-scrollbar">
          <div className="flex items-center h-full">
            {/* 9-dot Waffle Icon */}
            <button
              type="button"
              className="flex items-center justify-center p-1.5 rounded hover:bg-slate-100 text-slate-700 mr-2"
              title="App Launcher"
            >
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
                const isMatch =
                  tab.to !== '#' &&
                  (tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to));
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
                      <ChevronDown
                        className={`h-3 w-3 ${isMatch ? 'text-blue-600' : 'text-slate-400'}`}
                      />
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Right edit pencil icon */}
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 shrink-0 ml-2"
            title="Edit Navigation Items"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <Outlet />
      </main>

      {/* Global New Complaint Modal launched from the '+' button */}
      <NewComplaintModal
        open={newComplaintModalOpen}
        onClose={() => setNewComplaintModalOpen(false)}
        onCreated={(c) => {
          setNewComplaintModalOpen(false);
          navigate(`/complaints/${c._id}`);
        }}
      />

      {/* Help & Process Guide Slide-Over Modal ('?' button) */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-3 sm:p-6 animate-in fade-in"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-md border border-slate-300 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-t-4 border-t-[#0176d3] border-b border-slate-200 bg-[#f4f6f9] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#0176d3]" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Natural Remedies EQMS – Process & Help Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-700">
              <section className="space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  End-to-End Complaint Lifecycle (41-Step Workflow)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="border border-slate-200 rounded p-3 bg-slate-50">
                    <span className="font-bold text-blue-700 block">D1 – Define the Problem</span>
                    <p className="text-xs text-slate-600 mt-1">
                      Intake via WhatsApp Bot or Manual Entry. Acknowledged by Complaint Handler. Supporting evidence uploaded.
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded p-3 bg-slate-50">
                    <span className="font-bold text-blue-700 block">D2 – Grasp the Situation</span>
                    <p className="text-xs text-slate-600 mt-1">
                      First Responsible Person (FRP) assigned. SLA extensions requested & reviewed. FRP formal acknowledgement.
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded p-3 bg-slate-50">
                    <span className="font-bold text-blue-700 block">D3 – RCA & CAPA Planning</span>
                    <p className="text-xs text-slate-600 mt-1">
                      Fishbone diagram (max 3 items/category) or 5-Why analysis. Dual review gate by FRP Manager & Complaint Handler.
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded p-3 bg-slate-50">
                    <span className="font-bold text-blue-700 block">D4 – Effectiveness & Closure</span>
                    <p className="text-xs text-slate-600 mt-1">
                      COPQ calculation in INR. ERP assigned with Timeline/Frequency. Verification completed and PDF attached.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2 border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Key Roles & Primary Contacts
                </h4>
                <div className="rounded border border-slate-200 divide-y divide-slate-100 text-xs">
                  <div className="p-2.5 flex justify-between">
                    <span className="font-medium text-slate-800">Complaint Handler / Admin</span>
                    <span className="text-blue-600 font-semibold">Sneha (admin@naturalremedies.com)</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="font-medium text-slate-800">Quality Coordinator (Omnicare)</span>
                    <span className="text-slate-600">Jensy Josephine / Sneha</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="font-medium text-slate-800">Quality Coordinator (Remicare)</span>
                    <span className="text-slate-600">Unnati</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="font-medium text-slate-800">Quality Coordinator (Phytocare)</span>
                    <span className="text-slate-600">Shweta</span>
                  </div>
                </div>
              </section>

              <section className="space-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-500">
                <p><strong>Quick Shortcuts:</strong></p>
                <p>• Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[11px]">/</kbd> anywhere to focus the search bar.</p>
                <p>• Click <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[11px]">+</kbd> in the header to register a complaint immediately.</p>
                <p>• Click <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[11px]">☆</kbd> on any complaint page to pin it to your Favorites.</p>
              </section>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="px-4 py-1.5 rounded bg-[#0176d3] text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-2xs"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
