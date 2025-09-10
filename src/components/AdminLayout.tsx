'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  CogIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BellIcon,
  ScaleIcon,
  ClipboardDocumentListIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Settings', href: '/admin/settings', icon: CogIcon },
  { name: 'KYC Management', href: '/admin/kyc', icon: UserGroupIcon },
  { name: 'Listings', href: '/admin/listings', icon: DocumentTextIcon },
  { name: 'Payments', href: '/admin/payments', icon: CreditCardIcon },
  { name: 'Notifications', href: '/admin/templates', icon: BellIcon },
  { name: 'Legal', href: '/admin/legal', icon: ScaleIcon },
  { name: 'Reports', href: '/admin/reports', icon: ClipboardDocumentListIcon },
  { name: 'Audit Log', href: '/admin/audit', icon: ClipboardDocumentListIcon },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Refs for focus management
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);
  const desktopSidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  // Focus management for mobile sidebar
  useEffect(() => {
    if (sidebarOpen) {
      // Focus the first navigation item when sidebar opens
      const firstNavItem = mobileSidebarRef.current?.querySelector('a[href]') as HTMLElement;
      if (firstNavItem) {
        firstNavItem.focus();
      }

      // Handle escape key to close sidebar
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setSidebarOpen(false);
          // Return focus to the menu button
          if (mobileMenuButtonRef.current) {
            mobileMenuButtonRef.current.focus();
          }
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [sidebarOpen]);

  const closeMobileSidebar = () => {
    setSidebarOpen(false);
    // Return focus to the menu button
    if (mobileMenuButtonRef.current) {
      mobileMenuButtonRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
        <div
          ref={mobileSidebarRef}
          className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl"
          role="navigation"
          aria-label="Admin navigation"
        >
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-brand-600" aria-hidden="true" />
              <span className="ml-2 text-xl font-bold text-gray-900">MatEx Admin</span>
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
              onClick={closeMobileSidebar}
              aria-label="Close navigation menu"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4" role="navigation" aria-label="Admin sections">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                    isActive
                      ? 'bg-brand-100 text-brand-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={closeMobileSidebar}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 ${
                      isActive ? 'text-brand-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <Link
              href="/"
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1 transition-colors"
              aria-label="Return to main MatEx website"
            >
              <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to MatEx
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div
          ref={desktopSidebarRef}
          className="flex flex-col flex-grow bg-white border-r border-gray-200"
          role="navigation"
          aria-label="Admin navigation"
        >
          <div className="flex h-16 items-center px-4">
            <ShieldCheckIcon className="h-8 w-8 text-brand-600" aria-hidden="true" />
            <span className="ml-2 text-xl font-bold text-gray-900">MatEx Admin</span>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4" role="navigation" aria-label="Admin sections">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                    isActive
                      ? 'bg-brand-100 text-brand-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 ${
                      isActive ? 'text-brand-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <Link
              href="/"
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1 transition-colors"
              aria-label="Return to main MatEx website"
            >
              <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to MatEx
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8" role="banner">
          <button
            ref={mobileMenuButtonRef}
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
            onClick={() => setSidebarOpen(true)}
            aria-expanded={sidebarOpen}
            aria-controls="mobile-sidebar"
            aria-label="Open navigation menu"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="text-sm text-gray-700" role="status" aria-live="polite">
                Admin Dashboard
              </div>
            </div>
          </div>
        </header>

        <main
          ref={mainContentRef}
          id="main-content"
          className="py-10"
          role="main"
          aria-label="Admin dashboard content"
          tabIndex={-1}
        >
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
