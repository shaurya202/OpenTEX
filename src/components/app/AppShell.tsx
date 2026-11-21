'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  HelpCircle,
  Menu,
  Moon,
  Presentation,
  Settings,
  Sun,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { getAppPreferences, saveAppPreferences } from '@/lib/storage';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchExact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Convert Notes', href: '/app', icon: FileText, matchExact: true },
  { label: 'Slides', href: '/app/slides', icon: Presentation },
  { label: 'My Conversions', href: '/app/conversions', icon: FolderOpen },
  { label: 'Tools', href: '/app/tools', icon: Wrench },
  { label: 'Communities', href: '/app/communities', icon: Users },
  { label: 'Settings', href: '/app/settings', icon: Settings },
  { label: 'MCP Guide', href: '/app/mcp-guide', icon: BookOpen },
  { label: 'Help & Tips', href: '/app/help', icon: HelpCircle },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const syncTheme = () => {
      const prefs = getAppPreferences();
      const resolved =
        prefs.theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : prefs.theme;
      setTheme(resolved);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
      document.documentElement.style.colorScheme = resolved;
    };

    syncTheme();
    window.addEventListener('mw-preferences-updated', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('mw-preferences-updated', syncTheme);
      window.removeEventListener('storage', syncTheme);
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSetTheme = (nextTheme: 'light' | 'dark') => {
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.style.colorScheme = nextTheme;
    const prefs = getAppPreferences();
    saveAppPreferences({ ...prefs, theme: nextTheme });
    window.dispatchEvent(new Event('mw-preferences-updated'));
  };

  const isDark = theme === 'dark';

  const isActive = (item: NavItem) => {
    if (item.matchExact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const sidebarContent = (isMobile = false) => (
    <div
      className={`flex h-full flex-col justify-between transition-colors ${
        isDark ? 'bg-[#161618] text-[#F5F5F7]' : 'bg-[#F5F5F7] text-[#1D1D1F]'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div
          className={`flex items-center justify-between border-b px-4 py-4 ${
            isDark ? 'border-[#2C2C2E]' : 'border-[#D2D2D7]'
          }`}
        >
          <Link href="/app" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1D1D1F] font-serif text-sm font-semibold text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F]">
              &part;
            </div>
            {(!collapsed || isMobile) && (
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  Open<span className="text-[#0071E3]">TEX</span>
                </div>
                <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                  LaTeX Studio
                </div>
              </div>
            )}
          </Link>

          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg p-1.5 ${
                isDark ? 'text-[#A1A1A6] hover:bg-[#2C2C2E]' : 'text-[#6E6E73] hover:bg-black/5'
              }`}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className={`hidden rounded-lg p-1.5 lg:inline-flex ${
                isDark ? 'text-[#A1A1A6] hover:bg-[#2C2C2E]' : 'text-[#6E6E73] hover:bg-black/5'
              }`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="space-y-0.5 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed && !isMobile ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? isDark
                      ? 'bg-[#0071E3]/15 text-[#4DA3FF]'
                      : 'bg-white text-[#0071E3] shadow-2xs'
                    : isDark
                    ? 'text-[#A1A1A6] hover:bg-[#2C2C2E]/60 hover:text-[#F5F5F7]'
                    : 'text-[#6E6E73] hover:bg-black/5 hover:text-[#1D1D1F]'
                } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div
        className={`space-y-2 border-t p-3 ${
          isDark ? 'border-[#2C2C2E]' : 'border-[#D2D2D7]'
        }`}
      >
        {/* Desktop & Mobile Theme Switcher */}
        {(!collapsed || isMobile) ? (
          <div
            className={`grid grid-cols-2 gap-1 rounded-xl p-1 ${
              isDark ? 'bg-[#1C1C1E]' : 'bg-[#E5E5EA]/70'
            }`}
          >
            <button
              type="button"
              onClick={() => handleSetTheme('light')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                !isDark
                  ? 'bg-white text-[#1D1D1F] shadow-xs'
                  : 'text-[#A1A1A6] hover:text-[#F5F5F7]'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => handleSetTheme('dark')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                isDark
                  ? 'bg-[#2C2C2E] text-[#F5F5F7] shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              Dark
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handleSetTheme(isDark ? 'light' : 'dark')}
            className={`flex w-full items-center justify-center rounded-xl p-2.5 ${
              isDark ? 'text-[#F5F5F7] hover:bg-[#1C1C1E]' : 'text-[#6E6E73] hover:bg-black/5'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        <Link
          href="/"
          title={collapsed && !isMobile ? 'Back to Home' : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
            isDark
              ? 'text-[#A1A1A6] hover:bg-[#1C1C1E] hover:text-[#F5F5F7]'
              : 'text-[#6E6E73] hover:bg-black/5 hover:text-[#1D1D1F]'
          } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {(!collapsed || isMobile) && <span>Back to Home</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <div
      data-theme={theme}
      className={`flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden ${
        isDark ? 'bg-[#0B0B0D] text-[#F5F5F7]' : 'bg-[#F5F5F7] text-[#1D1D1F]'
      }`}
    >
      {/* Mobile Top Header */}
      <header
        className={`flex items-center justify-between border-b px-4 py-3 lg:hidden ${
          isDark ? 'border-[#2C2C2E] bg-[#161618]' : 'border-[#D2D2D7] bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={`rounded-lg p-1.5 ${
              isDark ? 'text-[#A1A1A6] hover:bg-[#2C2C2E]' : 'text-[#6E6E73] hover:bg-black/5'
            }`}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/app" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1D1D1F] font-serif text-xs font-semibold text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F]">
              &part;
            </span>
            <span>
              Open<span className="text-[#0071E3]">TEX</span>
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => handleSetTheme(isDark ? 'light' : 'dark')}
          className={`rounded-lg p-2 ${
            isDark ? 'bg-[#2C2C2E] text-[#F5F5F7]' : 'bg-[#F5F5F7] text-[#1D1D1F]'
          }`}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 h-full w-72 max-w-[85vw] shadow-2xl">
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden shrink-0 border-r transition-all duration-200 lg:block ${
          collapsed ? 'w-[72px]' : 'w-64'
        } ${isDark ? 'border-[#2C2C2E]' : 'border-[#D2D2D7]'}`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
