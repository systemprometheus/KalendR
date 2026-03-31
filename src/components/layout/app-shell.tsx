'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar, CalendarDays, Clock, Users, Link2, Settings,
  CreditCard, Zap, ChevronDown, LogOut, Menu, X, Home,
  GitBranch, LayoutGrid, Bell, Code
} from 'lucide-react';
import { ToastProvider } from '../ui/toast';

const navigation = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Event Types', href: '/dashboard/event-types', icon: LayoutGrid },
  { name: 'Bookings', href: '/dashboard/bookings', icon: CalendarDays },
  { name: 'Availability', href: '/dashboard/availability', icon: Clock },
  { name: 'Routing Forms', href: '/dashboard/routing', icon: GitBranch },
  { name: 'Workflows', href: '/dashboard/workflows', icon: Zap },
  { name: 'Embed', href: '/dashboard/embed', icon: Code },
];

const secondaryNav = [
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Integrations', href: '/dashboard/integrations', icon: Link2 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
];

interface AppShellProps {
  children: React.ReactNode;
  user?: any;
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:flex lg:flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
            <div className="w-8 h-8 bg-[#0069ff] rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">KalendR</span>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <div className="mb-2">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduling</p>
            </div>
            {navigation.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-[#0069ff]'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </Link>
            ))}

            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</p>
            </div>
            {secondaryNav.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-[#0069ff]'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0069ff] flex items-center justify-center text-white text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-fade-in">
                  <Link href="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>
                    <Settings className="w-4 h-4" /> Account Settings
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#0069ff] rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">KalendR</span>
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
