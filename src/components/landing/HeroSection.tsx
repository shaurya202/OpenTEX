'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, ExternalLink } from 'lucide-react';
import { openInOverleaf } from '@/lib/exporters';

type SampleId = 'limits' | 'matrices' | 'integrals';

interface HeroSample {
  id: SampleId;
  label: string;
  fileName: string;
  latex: string;
  lines: { num: number; tokens: { text: string; kind: 'cmd' | 'math' | 'brace' | 'comment' | 'plain' }[] }[];
}

const SAMPLES: Record<SampleId, HeroSample> = {
  limits: {
    id: 'limits',
    label: 'Limits',
    fileName: 'limits_definition.tex',
    latex: `\\section*{Limits. Definitions}

\\textbf{Precise Definition:} We say $\\lim_{x \\to a} f(x) = L$ if for every $\\varepsilon > 0$ there is $\\delta > 0$ such that
\\[
0 < |x - a| < \\delta \\implies |f(x) - L| < \\varepsilon.
\\]`,
    lines: [
      {
        num: 1,
        tokens: [
          { text: '\\section*', kind: 'cmd' },
          { text: '{', kind: 'brace' },
          { text: 'Limits. Definitions', kind: 'plain' },
          { text: '}', kind: 'brace' },
        ],
      },
      { num: 2, tokens: [{ text: '% Transcribed with Publik AI', kind: 'comment' }] },
      {
        num: 3,
        tokens: [
          { text: '\\textbf', kind: 'cmd' },
          { text: '{', kind: 'brace' },
          { text: 'Precise Definition:', kind: 'plain' },
          { text: '} ', kind: 'brace' },
          { text: 'We say ', kind: 'plain' },
          { text: '$\\lim_{x \\to a} f(x) = L$', kind: 'math' },
        ],
      },
      {
        num: 4,
        tokens: [
          { text: 'if for every ', kind: 'plain' },
          { text: '$\\varepsilon > 0$', kind: 'math' },
          { text: ' there is ', kind: 'plain' },
          { text: '$\\delta > 0$', kind: 'math' },
          { text: ' such that', kind: 'plain' },
        ],
      },
      { num: 5, tokens: [{ text: '\\[', kind: 'brace' }] },
      {
        num: 6,
        tokens: [{ text: '  0 < |x - a| < \\delta \\implies |f(x) - L| < \\varepsilon.', kind: 'math' }],
      },
      { num: 7, tokens: [{ text: '\\]', kind: 'brace' }] },
    ],
  },
  matrices: {
    id: 'matrices',
    label: 'Matrices',
    fileName: 'spectral_theorem.tex',
    latex: `\\section*{Eigenvalues \\& Diagonalization}

Find $\\lambda$ where $\\det(A - \\lambda I) = 0$:
\\[
A = \\begin{pmatrix} 4 & 1 \\\\ 2 & 3 \\end{pmatrix}, \\quad
\\det(A - \\lambda I) = (\\lambda - 5)(\\lambda - 2) = 0
\\]
\\begin{equation}
\\lambda_1 = 5,\\; \\lambda_2 = 2 \\implies A = P D P^{-1}
\\end{equation}`,
    lines: [
      {
        num: 1,
        tokens: [
          { text: '\\section*', kind: 'cmd' },
          { text: '{', kind: 'brace' },
          { text: 'Eigenvalues \\& Diagonalization', kind: 'plain' },
          { text: '}', kind: 'brace' },
        ],
      },
      { num: 2, tokens: [{ text: '% Linear Algebra, Chapter 4', kind: 'comment' }] },
      {
        num: 3,
        tokens: [
          { text: 'Find ', kind: 'plain' },
          { text: '$\\lambda$', kind: 'math' },
          { text: ' where ', kind: 'plain' },
          { text: '$\\det(A - \\lambda I) = 0$', kind: 'math' },
          { text: ':', kind: 'plain' },
        ],
      },
      { num: 4, tokens: [{ text: '\\[', kind: 'brace' }] },
      {
        num: 5,
        tokens: [
          { text: '  A = ', kind: 'math' },
          { text: '\\begin{pmatrix}', kind: 'cmd' },
          { text: ' 4 & 1 \\\\ 2 & 3 ', kind: 'math' },
          { text: '\\end{pmatrix}', kind: 'cmd' },
        ],
      },
      {
        num: 6,
        tokens: [{ text: '  \\det(A - \\lambda I) = (\\lambda - 5)(\\lambda - 2) = 0', kind: 'math' }],
      },
      { num: 7, tokens: [{ text: '\\]', kind: 'brace' }] },
      { num: 8, tokens: [] },
      {
        num: 9,
        tokens: [
          { text: '\\begin', kind: 'cmd' },
          { text: '{', kind: 'brace' },
          { text: 'equation', kind: 'plain' },
          { text: '}', kind: 'brace' },
        ],
      },
      {
        num: 10,
        tokens: [{ text: '  \\lambda_1 = 5,\\; \\lambda_2 = 2 \\implies A = P D P^{-1}', kind: 'math' }],
      },
      {
        num: 11,
        tokens: [
          { text: '\\end', kind: 'cmd' },
          { text: '{', kind: 'brace' },
          { text: 'equation', kind: 'plain' },
          { text: '}', kind: 'brace' },
        ],
      },
    ],
  },
  integrals: {
    id: 'integrals',
    label: 'Integrals',
    fileName: 'gaussian_integral.tex',
    latex: `\\section*{Gaussian \\& Contour Integrals}

Let $I = \\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx$. Passing to polar coordinates gives
\\[
I^2 = \\int_0^{2\\pi} \\int_0^{\\infty} e^{-r^2} r\\,dr\\,d\\theta = \\pi \\implies I = \\sqrt{\\pi}.
\\]`,
    lines: [
      {
        num: 1,
        tokens: [
          { text: '\\section*', kind: 'cmd' },
          { text: '{', kind: 'brace' },
          { text: 'Gaussian \\& Contour Integrals', kind: 'plain' },
          { text: '}', kind: 'brace' },
        ],
      },
      { num: 2, tokens: [{ text: '% Multivariable Analysis', kind: 'comment' }] },
      {
        num: 3,
        tokens: [
          { text: 'Let ', kind: 'plain' },
          { text: '$I = \\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx$', kind: 'math' },
          { text: '. Passing to polar coordinates:', kind: 'plain' },
        ],
      },
      { num: 4, tokens: [{ text: '\\[', kind: 'brace' }] },
      {
        num: 5,
        tokens: [{ text: '  I^2 = \\int_0^{2\\pi} \\int_0^{\\infty} e^{-r^2} r\\,dr\\,d\\theta = \\pi', kind: 'math' }],
      },
      {
        num: 6,
        tokens: [{ text: '  \\implies I = \\sqrt{\\pi}.', kind: 'math' }],
      },
      { num: 7, tokens: [{ text: '\\]', kind: 'brace' }] },
    ],
  },
};

function HandwrittenSketch({ sampleId }: { sampleId: SampleId }) {
  if (sampleId === 'matrices') {
    return (
      <div className="space-y-3.5 text-[#1D1D1F]">
        <div className="border-b border-[#E5E5EA] pb-1.5 font-serif text-[17px] italic">
          2. Eigenvalues &amp; Diagonalization
        </div>
        <div className="font-serif text-[13px] text-[#3A3A3C]">
          Find <span className="italic">&lambda;</span> where <span className="italic">det(A &minus; &lambda;I) = 0</span>
        </div>
        <div className="rounded-lg border border-[#E5E5EA] bg-[#FAFAFC] p-3 text-center font-serif text-sm">
          A = [ 4 &nbsp; 1 ; &nbsp; 2 &nbsp; 3 ] &nbsp;&rarr;&nbsp; (&lambda; &minus; 5)(&lambda; &minus; 2) = 0
        </div>
        <div className="font-serif text-sm text-[#0071E3]">
          &lambda;<sub>1</sub> = 5, &nbsp;&lambda;<sub>2</sub> = 2 &nbsp;&rArr;&nbsp; A = PDP<sup>&minus;1</sup>
        </div>
      </div>
    );
  }

  if (sampleId === 'integrals') {
    return (
      <div className="space-y-3.5 text-[#1D1D1F]">
        <div className="border-b border-[#E5E5EA] pb-1.5 font-serif text-[17px] italic">
          3. Gaussian Integral
        </div>
        <div className="font-serif text-sm text-[#3A3A3C]">
          I = &int;<sub>&minus;&infin;</sub><sup>&infin;</sup> e<sup>&minus;x&sup2;</sup> dx
        </div>
        <div className="rounded-lg border border-[#E5E5EA] bg-[#FAFAFC] p-3 text-center font-serif text-sm">
          I&sup2; = &int;<sub>0</sub><sup>2&pi;</sup> &int;<sub>0</sub><sup>&infin;</sup> e<sup>&minus;r&sup2;</sup> r dr d&theta; = &pi;
        </div>
        <div className="font-serif text-sm font-medium text-[#0071E3]">
          &there4; &nbsp; I = &radic;&pi;
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 text-[#1D1D1F]">
      <div className="border-b border-[#E5E5EA] pb-1.5 font-serif text-[17px] italic">
        1. Limits. Definitions
      </div>
      <div className="font-serif text-[13px] text-[#3A3A3C]">
        Def: We say <span className="italic">lim<sub>x&rarr;a</sub> f(x) = L</span> if &forall;{'\u03b5'} &gt; 0, &exist;&delta; &gt; 0 s.t.
      </div>
      <div className="rounded-lg border border-[#E5E5EA] bg-[#FAFAFC] p-3 text-center font-serif text-sm italic">
        0 &lt; |x &minus; a| &lt; &delta; &nbsp;&rArr;&nbsp; |f(x) &minus; L| &lt; {'\u03b5'}
      </div>
      <svg viewBox="0 0 260 66" className="w-full" aria-label="Limit epsilon-delta sketch">
        <line x1="16" y1="54" x2="244" y2="54" stroke="#8E8E93" strokeWidth="1" />
        <line x1="28" y1="8" x2="28" y2="60" stroke="#8E8E93" strokeWidth="1" />
        <path d="M 38 48 Q 110 42 150 26 T 236 12" fill="none" stroke="#1D1D1F" strokeWidth="1.6" />
        <line x1="28" y1="26" x2="150" y2="26" stroke="#0071E3" strokeDasharray="3 3" strokeWidth="1" />
        <line x1="150" y1="26" x2="150" y2="54" stroke="#0071E3" strokeDasharray="3 3" strokeWidth="1" />
        <circle cx="150" cy="26" r="3" fill="#fff" stroke="#0071E3" strokeWidth="1.8" />
        <text x="147" y="64" fontSize="9" fill="#6E6E73" fontFamily="serif" fontStyle="italic">a</text>
        <text x="14" y="29" fontSize="9" fill="#6E6E73" fontFamily="serif" fontStyle="italic">L</text>
      </svg>
    </div>
  );
}

const EXPORTS = ['Overleaf', 'Word (.docx)', 'Typst (.typ)', 'Markdown (.md)', 'Beamer Slides'];

export function HeroSection() {
  const [activeSample, setActiveSample] = useState<SampleId>('limits');
  const [copied, setCopied] = useState(false);

  const sample = SAMPLES[activeSample];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sample.latex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="bg-[#F5F5F7] pt-14 pb-16 sm:pt-20 sm:pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-4xl font-normal tracking-tight text-[#1D1D1F] sm:text-6xl sm:leading-[1.06]">
            Typeset handwritten math into LaTeX in seconds.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#6E6E73] sm:text-lg">
            Upload a photo of lecture notes, drop in a scanned PDF, or sketch equations on the canvas. OpenTEX outputs compilable LaTeX, Beamer slide decks, and TikZ diagrams.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/app"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0071E3] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0077ED] sm:w-auto"
            >
              <span>Open Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#workflow"
              className="inline-flex w-full items-center justify-center rounded-lg border border-[#D2D2D7] bg-white px-5 py-3 text-sm font-medium text-[#1D1D1F] transition-colors hover:bg-[#FAFAFC] sm:w-auto"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Document Studio Workbench */}
        <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-xl border border-[#D2D2D7] bg-white shadow-xs">
          {/* Workbench Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5EA] bg-[#FAFAFC] px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-medium text-[#1D1D1F]">{sample.fileName}</span>
              <span className="text-xs text-[#8E8E93]">&middot; Live sample</span>
            </div>

            {/* Sample Switcher */}
            <div className="inline-flex rounded-lg bg-[#E5E5EA]/70 p-0.5">
              {(Object.keys(SAMPLES) as SampleId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSample(id)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    activeSample === id
                      ? 'bg-white text-[#1D1D1F] shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {SAMPLES[id].label}
                </button>
              ))}
            </div>
          </div>

          {/* Split Canvas */}
          <div className="grid lg:grid-cols-12">
            {/* Left: Handwritten Note Sheet */}
            <div className="border-b border-[#E5E5EA] bg-[#FCFCFD] p-5 sm:p-6 lg:col-span-5 lg:border-r lg:border-b-0">
              <div className="mb-3 flex items-center justify-between text-xs text-[#6E6E73]">
                <span className="font-medium">Input note</span>
                <span className="font-mono text-[11px]">PNG / PDF</span>
              </div>

              <div className="paper-grid rounded-lg border border-[#D2D2D7] bg-white p-5">
                <HandwrittenSketch sampleId={activeSample} />
              </div>
            </div>

            {/* Right: LaTeX Source */}
            <div className="flex flex-col justify-between bg-[#161618] p-5 text-[#F5F5F7] sm:p-6 lg:col-span-7">
              <div>
                <div className="mb-3 flex items-center justify-between text-xs text-[#A1A1A6]">
                  <span className="font-medium">Generated LaTeX</span>
                  <span className="font-mono text-[11px]">amsmath &middot; UTF-8</span>
                </div>

                <div className="font-mono overflow-x-hidden text-[12px] leading-relaxed sm:text-[13px]">
                  {sample.lines.map((line) => (
                    <div key={line.num} className="flex gap-4">
                      <span className="tabular-nums w-5 shrink-0 select-none text-right text-[#636366]">
                        {line.num}
                      </span>
                      <span className="min-w-0 whitespace-pre-wrap break-words">
                        {line.tokens.length === 0 ? ' ' : null}
                        {line.tokens.map((tok, i) => {
                          const cls =
                            tok.kind === 'cmd'
                              ? 'text-[#64D2FF]'
                              : tok.kind === 'math'
                                ? 'text-[#30D158]'
                                : tok.kind === 'brace'
                                  ? 'text-[#FFD60A]'
                                  : tok.kind === 'comment'
                                    ? 'text-[#8E8E93]'
                                    : 'text-[#F5F5F7]';
                          return (
                            <span key={i} className={cls}>
                              {tok.text}
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <div className="inline-flex items-center gap-2 text-xs text-[#30D158]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#30D158]" />
                  <span>Compiled cleanly</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-[#F5F5F7] transition-colors hover:bg-white/10"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-[#30D158]" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openInOverleaf(sample.latex, sample.fileName)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0071E3] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0077ED]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open in Overleaf</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#6E6E73]">
          <span className="font-medium text-[#1D1D1F]">Exports to</span>
          {EXPORTS.map((target) => (
            <span key={target}>{target}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
