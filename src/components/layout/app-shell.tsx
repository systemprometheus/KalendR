'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar, CalendarDays, Clock, Users, Link2, Settings,
  CreditCard, Zap, ChevronDown, LogOut, Menu, X, Home,
  GitBranch, LayoutGrid, Bell, Code, BarChart3, Shield,
  HelpCircle, ChevronLeft, Plus, Pencil, Contact
} from 'lucide-react';
import { ToastProvider } from '../ui/toast';
import Logo from '../ui/logo';

const mainNav = [
  { name: 'Scheduling', href: '/dashboard/event-types', icon: Pencil },
  { name: 'Meetings', href: '/dashboard/bookings', icon: CalendarDays },
  { name: 'Availability', href: '/dashboard/availability', icon: Clock },
  { name: 'Contacts', href: '/dashboard/contacts', icon: Contact },
  { name: 'Workflows', href: '/dashboard/workflows', icon: Zap },
  { name: 'Integrations & apps', href: '/dashboard/integrations', icon: LayoutGrid },
  { name: 'Routing', href: '/dashboard/routing', icon: GitBranch },
];

const bottomNav = [
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Admin center', href: '/dashboard/settings', icon: Shield },
];

interface AppShellProps {
  children: React.ReactNode;
  user?: any;
  currentPlan?: string;
}

export function AppShell({ children, user, currentPlan = 'free' }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const helpActive = pathname === '/help' || pathname.startsWith('/dashboard/help');
  const showUpgradeCta = currentPlan === 'free';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 ${collapsed ? 'w-16' : 'w-[240px]'} bg-white border-r border-gray-200 transform transition-all duration-200 lg:translate-x-0 lg:static lg:flex lg:flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Logo + collapse */}
          <div className="flex items-center justify-between px-5 py-4">
            {!collapsed && <Logo size="xs" />}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* + Create button */}
          <div className="px-3 mb-2">
            <Link
              href="/dashboard/event-types?create=true"
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-full border-2 border-[#03b2d1] text-[#03b2d1] text-sm font-semibold hover:bg-blue-50 transition-colors ${collapsed ? 'px-0' : 'px-4'}`}
            >
              <Plus className="w-4 h-4" />
              {!collapsed && 'Create'}
            </Link>
          </div>

          {/* Main navigation */}
          <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
            {mainNav.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-[#03b2d1] bg-blue-50/50'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#03b2d1] rounded-r-full" />
                  )}
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#03b2d1]' : 'text-gray-500'}`} />
                  {!collapsed && item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-gray-100 px-2 py-2 space-y-0.5">
            {showUpgradeCta && (
              <Link
                href="/dashboard/billing"
                className={`mb-2 flex items-center justify-center gap-2 rounded-lg bg-[#03b2d1] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0298b3] ${
                  collapsed ? 'px-0' : ''
                }`}
                aria-label="Upgrade"
              >
                <Zap className="w-4 h-4 flex-shrink-0" />
                {!collapsed && 'Upgrade'}
              </Link>
            )}
            {bottomNav.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-[#03b2d1] bg-blue-50/50'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#03b2d1] rounded-r-full" />
                  )}
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#03b2d1]' : 'text-gray-500'}`} />
                  {!collapsed && item.name}
                </Link>
              );
            })}
          </div>

          {/* User section */}
          <div className="border-t border-gray-200 p-3">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-100 transition-colors ${collapsed ? 'justify-center' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-[#03b2d1] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </>
                )}
              </button>

              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-fade-in z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                  </div>
                  <Link href="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>
                    <Settings className="w-4 h-4" /> Account Settings
                  </Link>
                  <Link href="/dashboard/team" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>
                    <Users className="w-4 h-4" /> Team
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
            <Link
              href="/help"
              className={`mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                helpActive
                  ? 'bg-blue-50 text-[#03b2d1]'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <HelpCircle className="w-4 h-4" />
              {!collapsed && 'Help'}
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <Logo size="sm" />
          </div>

          {/* Top bar with user avatar (desktop) */}
          <div className="hidden lg:flex items-center justify-end gap-3 px-6 py-3 bg-white border-b border-gray-100">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-500" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#03b2d1] flex items-center justify-center text-white text-sm font-medium cursor-pointer">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>

          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
