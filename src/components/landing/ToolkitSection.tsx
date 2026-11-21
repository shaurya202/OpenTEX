'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  FileDown,
  Languages,
  LayoutTemplate,
  PenTool,
  Sliders,
  Wand2,
} from 'lucide-react';

interface ToolItem {
  id: 'format' | 'translate' | 'templates' | 'convert' | 'suggestions' | 'sketch';
  name: string;
  subtitle: string;
  description: string;
  bullets: string[];
  preview: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolItem[] = [
  {
    id: 'format',
    name: 'Format',
    subtitle: 'Academic spacing and margins',
    description:
      'Normalize line spacing, font sizes, paper margins, alignment, and page numbering across rough drafts.',
    bullets: [
      '1.0, 1.5, or 2.0 line spacing with setspace',
      'Configurable geometry margins (1.27 cm to 3.18 cm)',
      'Automatic section and equation numbering',
    ],
    preview: `\\documentclass[12pt]{article}\n\\usepackage[margin=2.54cm]{geometry}\n\\usepackage{setspace}\n\\onehalfspacing`,
    icon: Sliders,
  },
  {
    id: 'translate',
    name: 'Translate',
    subtitle: 'Prose translation, math untouched',
    description:
      'Translate narrative proofs, captions, and section titles across 12 languages while preserving every formula.',
    bullets: [
      'Preserves LaTeX macros and inline math verbatim',
      'Supports 12 academic languages',
      'Keeps theorem and proof structure intact',
    ],
    preview: `\\section*{Teorema del Valor Medio}\nSea $f$ continua en $[a,b]$ y derivable en $(a,b)$:\n\\[ f'(c) = \\frac{f(b)-f(a)}{b-a} \\]`,
    icon: Languages,
  },
  {
    id: 'templates',
    name: 'Templates',
    subtitle: 'Publication layouts',
    description:
      'Switch between Academic, Two-Column Journal, Classic Serif, or Minimal handouts in a single pass.',
    bullets: [
      'Single-column and twocolumn journal preambles',
      'Configured hyperref, booktabs, and fancyhdr packages',
      'Optional title block and abstract scaffold',
    ],
    preview: `\\documentclass[11pt,twocolumn]{article}\n\\usepackage{amsmath, amssymb, booktabs, balance}\n\\begin{abstract} ... \\end{abstract}`,
    icon: LayoutTemplate,
  },
  {
    id: 'convert',
    name: 'Convert',
    subtitle: 'Multi-format document export',
    description:
      'Export LaTeX sources into Word (.docx), OpenDocument (.odt), Typst (.typ), or clean Markdown (.md).',
    bullets: [
      'Typst math syntax translation',
      'Editable Word and LibreOffice exports',
      'Markdown output with $ and $$ delimiters',
    ],
    preview: `= Spectral Decomposition\nEvery real symmetric $A$ satisfies:\n$ A = Q Lambda Q^T, quad Q^T Q = I $`,
    icon: FileDown,
  },
  {
    id: 'suggestions',
    name: 'Suggestions',
    subtitle: 'Targeted inline rewrites',
    description:
      'Select any theorem or proof inside the editor and describe the refinement you want to inspect before applying.',
    bullets: [
      'Side-by-side proposal preview with Accept or Reject',
      'Expands terse derivations step by step',
      'Fixes broken delimiters and environment tags',
    ],
    preview: `\\begin{proof}\n  Applying Cauchy-Schwarz yields\n  $|\\langle u, v \\rangle|^2 \\leq \\|u\\|^2 \\|v\\|^2$.\n\\end{proof}`,
    icon: Wand2,
  },
  {
    id: 'sketch',
    name: 'Sketch',
    subtitle: 'Vector SVG and TikZ diagrams',
    description:
      'Draw on the canvas or crop an existing figure to generate scalable SVG artwork and editable TikZ code.',
    bullets: [
      'Interactive crop selection on uploaded scans',
      'Outputs standalone SVG plus tikzpicture code',
      'One-click insertion into active main.tex',
    ],
    preview: `\\begin{tikzpicture}[scale=1.1]\n  \\draw[->] (-2,0) -- (2,0) node[right] {$x$};\n  \\draw[thick,blue] plot[domain=-1.4:1.4] (\\x,{\\x*\\x});\n\\end{tikzpicture}`,
    icon: PenTool,
  },
];

export function ToolkitSection() {
  const [selectedId, setSelectedId] = useState<ToolItem['id']>('format');
  const current = TOOLS.find((t) => t.id === selectedId) ?? TOOLS[0];

  return (
    <section id="toolkit" className="border-t border-[#D2D2D7] bg-[#F5F5F7] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] sm:text-4xl">
            Six post-conversion tools built into one inspector.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
            Refine layouts, translate text, convert file formats, or turn hand-drawn plots into TikZ without switching apps.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-12">
          {/* Tool List */}
          <div className="divide-y divide-[#E5E5EA] overflow-hidden rounded-xl border border-[#D2D2D7] bg-white lg:col-span-5">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isSelected = tool.id === selectedId;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setSelectedId(tool.id)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors ${
                    isSelected ? 'bg-[#F5F5F7]' : 'hover:bg-[#FAFAFC]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? 'bg-[#0071E3] text-white'
                          : 'border border-[#D2D2D7] bg-white text-[#6E6E73]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-[#1D1D1F]">{tool.name}</div>
                      <div className="text-xs text-[#6E6E73]">{tool.subtitle}</div>
                    </div>
                  </div>
                  <ArrowRight
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isSelected ? 'translate-x-0.5 text-[#0071E3]' : 'text-[#AEAEB2]'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Detail Inspector */}
          <div className="rounded-xl border border-[#D2D2D7] bg-white p-6 shadow-xs sm:p-8 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5EA] pb-5">
              <div>
                <p className="text-xs font-medium text-[#0071E3]">{current.subtitle}</p>
                <h3 className="mt-1 font-serif text-2xl font-normal text-[#1D1D1F]">
                  {current.name} Tool
                </h3>
              </div>
              <Link
                href={`/app/tools?tool=${current.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0071E3] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#0077ED]"
              >
                <span>Open {current.name}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-[#6E6E73]">{current.description}</p>

            <ul className="mt-5 space-y-2.5">
              {current.bullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2.5 text-sm text-[#1D1D1F]">
                  <Check className="h-4 w-4 shrink-0 text-[#0071E3]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 overflow-hidden rounded-lg border border-[#2C2C2E] bg-[#161618]">
              <div className="border-b border-white/10 px-3.5 py-2 font-mono text-[11px] text-[#8E8E93]">
                Output preview
              </div>
              <pre className="font-mono overflow-x-auto p-4 text-xs leading-6 text-[#F5F5F7]">
                {current.preview}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
