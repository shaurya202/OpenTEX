'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';

const NAV_LINKS = [
  { label: 'Workflow', href: '#workflow' },
  { label: 'Toolkit', href: '#toolkit' },
  { label: 'Slides', href: '#presentations' },
  { label: 'MCP', href: '#mcp' },
  { label: 'FAQ', href: '#faq' },
];

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="apple-glass sticky top-0 z-50 border-b border-[#D2D2D7]/80 text-[#1D1D1F]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
          <BrandMark className="h-7 w-7" />
          <span>
            Open<span className="text-[#0071E3]">TEX</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13px] font-medium text-[#6E6E73] transition-colors hover:text-[#1D1D1F]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/app/conversions"
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#6E6E73] transition-colors hover:text-[#1D1D1F]"
          >
            Library
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0071E3] px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#0077ED]"
          >
            <span>Open Workspace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#1D1D1F] hover:bg-black/5 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#D2D2D7] bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#1D1D1F] hover:bg-[#F5F5F7]"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-[#D2D2D7] pt-3">
              <Link
                href="/app/conversions"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-[#D2D2D7] px-3 py-2 text-center text-sm font-medium text-[#1D1D1F] hover:bg-[#F5F5F7]"
              >
                Library
              </Link>
              <Link
                href="/app"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-[#0071E3] px-3 py-2 text-center text-sm font-medium text-white"
              >
                Open Workspace
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
