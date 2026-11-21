'use client';

import { useState } from 'react';
import { CheckCircle2, Code2, Cpu, PenLine, Share2, Upload } from 'lucide-react';

interface StepSpec {
  num: string;
  title: string;
  desc: string;
  file: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  snippet: string[];
}

const STEPS: StepSpec[] = [
  {
    num: '1',
    title: 'Upload Notes or Sketch',
    desc: 'Drop a PNG, JPEG, or multi-page PDF, or draw equations directly on the canvas sketchpad.',
    file: 'input_scan.png',
    badge: 'Ready for OCR',
    icon: Upload,
    snippet: [
      '% Source file queued for transcription',
      '% Mode: Publik Vision (publik-smart)',
      '% Detected: integrals, nested fractions, theorem blocks',
    ],
  },
  {
    num: '2',
    title: 'Structural Analysis',
    desc: 'Identifies section hierarchy, theorem environments, aligned derivations, and margin notes.',
    file: 'layout_parse.json',
    badge: 'AST extracted',
    icon: Cpu,
    snippet: [
      '% Parsed document structure:',
      '%   - Heading: Fundamental Theorem of Calculus',
      '%   - Environments: theorem (1), equation (2)',
    ],
  },
  {
    num: '3',
    title: 'LaTeX Typesetting',
    desc: 'Outputs semantic amsmath and amsthm code tailored to your chosen preset and spacing.',
    file: 'main.tex',
    badge: 'Compiled',
    icon: Code2,
    snippet: [
      '\\documentclass[11pt]{article}',
      '\\usepackage{amsmath, amssymb, amsthm}',
      '\\begin{equation}',
      '  F(x) = \\int_{a}^{x} f(t)\\,dt, \\quad F\'(x) = f(x)',
      '\\end{equation}',
    ],
  },
  {
    num: '4',
    title: 'Edit Alongside KaTeX',
    desc: 'Verify rendered math in real time, highlight blocks for AI edits, or toggle Classic, Tagged, and Boxed styles.',
    file: 'main.tex',
    badge: 'Live preview',
    icon: PenLine,
    snippet: [
      '\\begin{theorem}[Evaluation Theorem]',
      '  If $f$ is continuous on $[a,b]$ and $G\'=f$, then',
      '  \\[ \\int_{a}^{b} f(x)\\,dx = G(b) - G(a). \\]',
      '\\end{theorem}',
    ],
  },
  {
    num: '5',
    title: 'Export Anywhere',
    desc: 'Send straight to Overleaf, print to PDF, or convert to Word, OpenDocument, Typst, Markdown, or Beamer.',
    file: 'exports/',
    badge: 'Exported',
    icon: Share2,
    snippet: [
      'Output targets:',
      '  main.tex        (LaTeX source)',
      '  main.pdf        (Academic print layout)',
      '  main.typ        (Typst document)',
      '  Overleaf        (One-click project post)',
    ],
  },
];

export function WorkflowSection() {
  const [active, setActive] = useState(2);
  const current = STEPS[active];

  return (
    <section id="workflow" className="border-t border-[#D2D2D7] bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] sm:text-4xl">
            From rough notebook page to typeset manuscript.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
            Five focused steps keep source code, compiled preview, and export formats synchronized without leaving your workspace.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-12">
          {/* Code / Output Inspector */}
          <div className="order-2 overflow-hidden rounded-xl border border-[#D2D2D7] bg-[#161618] text-[#F5F5F7] lg:order-1 lg:col-span-6">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#A1A1A6]">{current.file}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[#30D158]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{current.badge}</span>
              </span>
            </div>

            <pre className="font-mono min-h-[260px] overflow-x-auto p-5 text-[12.5px] leading-7 text-[#E5E5EA]">
              {current.snippet.join('\n')}
            </pre>

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-xs text-[#8E8E93]">
              <span className="tabular-nums">
                Step {active + 1} of {STEPS.length}
              </span>
              <span>Publik AI pipeline</span>
            </div>
          </div>

          {/* Interactive Stepper */}
          <ol className="order-1 divide-y divide-[#E5E5EA] overflow-hidden rounded-xl border border-[#D2D2D7] bg-white lg:order-2 lg:col-span-6">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isSelected = idx === active;
              return (
                <li key={step.num}>
                  <button
                    type="button"
                    onClick={() => setActive(idx)}
                    className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors ${
                      isSelected ? 'bg-[#F5F5F7]' : 'hover:bg-[#FAFAFC]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                        isSelected
                          ? 'bg-[#0071E3] text-white'
                          : 'border border-[#D2D2D7] bg-white text-[#6E6E73]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="tabular-nums font-mono text-xs text-[#6E6E73]">
                          0{step.num}
                        </span>
                        <h3 className="text-sm font-semibold text-[#1D1D1F]">{step.title}</h3>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[#6E6E73]">{step.desc}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
