'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type BeamerTheme = 'Madrid' | 'Warsaw' | 'Berlin';

interface ThemeConfig {
  id: BeamerTheme;
  headerBg: string;
  blockTitleBg: string;
  footerBg: string;
  label: string;
}

const THEMES: Record<BeamerTheme, ThemeConfig> = {
  Madrid: {
    id: 'Madrid',
    headerBg: 'bg-[#0071E3] text-white',
    blockTitleBg: 'bg-[#0071E3] text-white',
    footerBg: 'bg-[#004A99] text-white/90',
    label: 'Classic rounded blocks',
  },
  Warsaw: {
    id: 'Warsaw',
    headerBg: 'bg-[#1D1D1F] text-white',
    blockTitleBg: 'bg-[#1D1D1F] text-white',
    footerBg: 'bg-[#2C2C2E] text-white/90',
    label: 'High-contrast seminar bar',
  },
  Berlin: {
    id: 'Berlin',
    headerBg: 'bg-[#0F766E] text-white',
    blockTitleBg: 'bg-[#0F766E] text-white',
    footerBg: 'bg-[#115E59] text-white/90',
    label: 'Teal progress header',
  },
};

export function PresentationsSection() {
  const [theme, setTheme] = useState<BeamerTheme>('Madrid');
  const current = THEMES[theme];

  return (
    <section id="presentations" className="border-t border-[#D2D2D7] bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] sm:text-4xl">
              Typeset Beamer slide decks directly from lecture notes.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
              Choose from six Beamer themes, five color palettes, and brief to extended deck lengths, then inspect every slide before exporting to Overleaf.
            </p>
          </div>

          <Link
            href="/app/slides"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1D1D1F] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3A3A3C]"
          >
            <span>Open Slides Studio</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Interactive Beamer Preview */}
        <div className="mt-10 overflow-hidden rounded-xl border border-[#D2D2D7] bg-[#F5F5F7]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D2D2D7] bg-[#FAFAFC] px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-[#6E6E73]">
              <span className="font-mono">opentex.app/slides</span>
              <span className="hidden sm:inline">&middot; {current.label}</span>
            </div>

            <div className="inline-flex rounded-lg bg-[#E5E5EA]/70 p-0.5">
              {(Object.keys(THEMES) as BeamerTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    theme === t
                      ? 'bg-white text-[#1D1D1F] shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-8">
            <div className="mx-auto max-w-3xl overflow-hidden rounded-lg border border-[#D2D2D7] bg-white shadow-sm">
              <div className={`px-6 py-4 ${current.headerBg}`}>
                <div className="flex items-center justify-between font-mono text-[11px] opacity-85">
                  <span>Section 2 &middot; Spectral Theory</span>
                  <span>\usetheme{'{'}{theme}{'}'}</span>
                </div>
                <h3 className="mt-1 font-serif text-xl font-medium">
                  The Spectral Theorem for Symmetric Matrices
                </h3>
              </div>

              <div className="space-y-4 p-6 font-serif">
                <div className="overflow-hidden rounded-lg border border-[#D2D2D7]">
                  <div className={`px-3.5 py-1.5 font-sans text-xs font-medium ${current.blockTitleBg}`}>
                    Theorem (Real Spectral Decomposition)
                  </div>
                  <div className="bg-[#FAFAFC] px-4 py-3.5 text-sm leading-relaxed text-[#1D1D1F]">
                    Every real symmetric matrix <span className="font-serif italic">A = A<sup>T</sup></span> in{' '}
                    <span className="font-serif">&#8477;<sup>n &times; n</sup></span> is orthogonally diagonalizable:
                    <div className="my-2.5 text-center font-serif text-base italic text-[#1D1D1F]">
                      A = Q &Lambda; Q<sup>T</sup>, &nbsp;&nbsp; Q<sup>T</sup>Q = I
                    </div>
                    All eigenvalues are real and eigenvectors from distinct eigenspaces are orthogonal.
                  </div>
                </div>

                <ul className="list-disc space-y-1 pl-5 font-sans text-xs text-[#6E6E73] sm:text-sm">
                  <li>Real eigenvalues guarantee stability in quadratic forms.</li>
                  <li>Exports as compilable LaTeX Beamer code or printable PDF slides.</li>
                </ul>
              </div>

              <div className={`flex items-center justify-between px-4 py-1.5 font-sans text-[11px] ${current.footerBg}`}>
                <span>OpenTEX Beamer</span>
                <span>Linear Algebra</span>
                <span className="tabular-nums">1 / 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
