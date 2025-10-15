
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Package, Truck, Phone, Plane, User as UserIcon, Menu, LogOut, ArrowRightLeft, BarChart3, HelpCircle, Warehouse, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { User } from '@/api/entities';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from "@vercel/analytics/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Toaster } from '@/components/ui/toaster';

const navigationItems = [
  { title: 'Admin Dashboard', url: createPageUrl('AdminDashboard'), icon: LayoutDashboard, adminOnly: true },
  { title: 'Dashboard', url: createPageUrl('Dashboard'), icon: LayoutDashboard, adminOnly: false },
  { title: 'Dock Doors', url: createPageUrl('DockDoors'), icon: Warehouse, adminOnly: false },
  { title: 'Live Loads', url: createPageUrl('LiveLoads'), icon: Truck, adminOnly: false },
  { title: 'Call-Ins', url: createPageUrl('Call-Ins'), icon: Phone, adminOnly: false },
  { title: 'Dimensions', url: createPageUrl('Dimensions'), icon: Package, adminOnly: false },
  { title: 'Changeovers', url: createPageUrl('Changeovers'), icon: ArrowRightLeft, adminOnly: false },
  { title: 'BTX', url: createPageUrl('BTX'), icon: Plane, adminOnly: false },
  { title: 'Truckloads', url: createPageUrl('Truckloads'), icon: Truck, adminOnly: false },
  { title: 'Line Counts', url: createPageUrl('Line-Counts'), icon: BarChart3, adminOnly: false },
  { title: 'Help', url: createPageUrl('Help'), icon: HelpCircle, adminOnly: false },
];

// Lightweight page module prefetchers to speed up first navigation
const pagePrefetchLoaders: Record<string, (() => Promise<unknown>) | undefined> = {
  'Dashboard': () => import('./Dashboard'),
  'Admin Dashboard': () => import('./AdminDashboard'),
  'Dock Doors': () => import('./DockDoors'),
  'Live Loads': () => import('./LiveLoads'),
  'Call-Ins': () => import('./Call-Ins'),
  'Dimensions': () => import('./Dimensions'),
  'Changeovers': () => import('./Changeovers'),
  'BTX': () => import('./BTX'),
  'Truckloads': () => import('./Truckloads'),
  'Line Counts': () => import('./Line-Counts'),
  'Help': () => import('./Help'),
};

const prefetched = new Set<string>();
const prefetchPage = (title: string) => {
  if (prefetched.has(title)) return;
  const loader = pagePrefetchLoaders[title];
  if (!loader) return;
  prefetched.add(title);
  loader().catch(() => {
    // noop — prefetch failures shouldn't affect navigation
    prefetched.delete(title);
  });
};

const NavSkeleton = () => (
    <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 bg-slate-700/50 rounded-xl animate-pulse" />
        ))}
    </div>
);

const PaltraLogo = () => (
  <div className="flex items-center gap-3">
    <img 
      src="/logos/paltralogotp.png" 
      alt="Paltra Logo" 
      className="w-auto h-16"
    />
    <div className="flex flex-col">
      <span className="text-2xl font-bold text-white tracking-tight">Paltra</span>
      <span className="text-xs text-blue-200 -mt-1 font-medium">Your warehouse. Streamlined.</span>
    </div>
  </div>
);

const HeaderLogo = () => (
    <Link to={createPageUrl('DockDoors')} className="flex items-center">
      <span className="text-lg font-bold text-slate-800 tracking-tight">Legrand-FM</span>
    </Link>
);

const NavLink = React.memo(({ item, pathname, isMobile = false }: { 
  item: { title: string; url: string; icon: any; adminOnly: boolean }; 
  pathname: string; 
  isMobile?: boolean; 
}) => {
  const isActive = pathname === item.url;
  
  // Pre-compute class names to avoid repeated string operations
  const activeClasses = 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg';
  const inactiveClasses = isMobile 
    ? 'text-slate-300 hover:bg-slate-700/50 hover:text-white' 
    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white';
  const sizeClasses = isMobile ? 'text-base' : 'text-sm font-medium';
  
  return (
    <Link
      to={item.url}
      onMouseEnter={() => prefetchPage(item.title)}
      onFocus={() => prefetchPage(item.title)}
      className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${isActive ? activeClasses : inactiveClasses} ${sizeClasses}`}
    >
      <item.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
      {item.title}
    </Link>
  );
});

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { signOut, profile, user } = useAuth(); // Get user from AuthContext instead of local state

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };


  const getUserInitials = (profile) => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
    }
    return profile?.email?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  };
  
  const visibleNavItems = React.useMemo(() => {
    return navigationItems.filter(item => !item.adminOnly || profile?.role === 'admin');
  }, [profile]);

  // Idle prefetch a few common pages after initial render
  React.useEffect(() => {
    const idle = (cb: () => void) =>
      (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 600);
    const cancel = (id: any) =>
      (window as any).cancelIdleCallback ? (window as any).cancelIdleCallback(id) : clearTimeout(id);

    const handle = idle(() => {
      // Prefetch first 3 visible items to improve perceived speed
      try {
        visibleNavItems.slice(0, 3).forEach(i => prefetchPage(i.title));
      } catch {}
    });
    return () => cancel(handle as any);
  }, [visibleNavItems]);

  if (profile && profile.is_approved === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-8 h-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Account Pending Approval</h1>
            <p className="text-slate-600 mb-6">
              Your account is currently under review by an administrator. You will receive access to the portal once your account has been approved.
            </p>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                <strong>Account:</strong> {profile?.email}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Department:</strong> {profile?.department}
              </p>
            </div>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-x-hidden">
      {/* Fixed Sidebar */}
      <div className="hidden md:flex w-64 fixed left-0 top-0 h-full bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700 z-40">
        <div className="flex flex-col w-full">
          <div className="flex items-center px-6 py-5 border-b border-slate-700">
            <Link to={createPageUrl('DockDoors')} className="flex items-center">
              <PaltraLogo />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <nav className="space-y-2">
              {visibleNavItems.map((item) => (
                <NavLink key={item.title} item={item} pathname={location.pathname} />
              ))}
            </nav>
          </div>
          <div className="p-4 border-t border-slate-700">
            <div className="text-xs text-slate-400 text-center font-medium">
              © 2025 Paltra.us
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0 overflow-x-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-3 sm:px-6 shadow-sm z-30 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 md:hidden rounded-xl hover:bg-slate-100">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col bg-gradient-to-b from-slate-800 to-slate-900 text-white p-0 border-slate-700 w-64">
                <div className="flex items-center px-6 py-5 border-b border-slate-700">
                  <Link to={createPageUrl('LiveLoads')} className="flex items-center">
                    <PaltraLogo />
                  </Link>
                </div>
                <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
                  {visibleNavItems.map((item) => (
                    <NavLink key={item.title} item={item} pathname={location.pathname} isMobile={true} />
                  ))}
                </nav>
                <div className="p-4 border-t border-slate-700">
                  <div className="text-xs text-slate-400 text-center font-medium">
                    © 2025 Paltra.us
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <HeaderLogo />
          </div>

          <div className="flex-1 text-center hidden lg:block min-w-0">
            <div className="flex items-center justify-center gap-4">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">{currentPageName}</h1>
              <div className="h-8 w-px bg-slate-300 flex-shrink-0"></div>
              <span className="text-sm text-slate-600 font-medium bg-slate-100 px-3 py-1 rounded-full truncate">
                {profile?.company ? `${profile.company} Portal` : 'Paltra Warehouse Portal'}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white">
                  <div className="w-full h-full rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {getUserInitials(profile)}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 sm:w-72 rounded-xl border border-slate-200 shadow-xl bg-white/95 backdrop-blur-sm">
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-md flex-shrink-0">
                        <span className="text-white font-bold text-sm">{getUserInitials(profile)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{profile?.full_name || profile?.email || user?.email || 'Account'}</p>
                        <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
                        <div className="flex items-center flex-wrap gap-2 mt-1.5">
                          {profile?.company && (
                            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                              {profile.company}
                            </span>
                          )}
                          {profile?.department && (
                            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                              {profile.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg mx-2 mb-2 transition-colors hover:cursor-pointer">
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 overflow-x-hidden">
          <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 min-w-0">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
      <Analytics />
    </div>
  );
}
