'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Is OpenTEX completely free?',
    answer:
      'Yes. Every conversion mode, document tool, Beamer slide generator, and MCP endpoint runs without pricing tiers, credits, or page limits.',
  },
  {
    question: 'What is the difference between the Professional and Turbo models?',
    answer:
      'Professional maps to publik-smart for dense handwritten derivations, matrices, and sketches. Turbo maps to publik-fast for rapid conversion of clean typeset PDFs.',
  },
  {
    question: 'How does the Publik AI integration work?',
    answer:
      'OpenTEX calls OpenAI-compatible Publik AI endpoints at https://publikhq.com/api/v1. You can also supply your own OpenAI-compatible endpoint or API key in Settings, and an offline fallback runs automatically when no key is set.',
  },
  {
    question: 'Where are my conversions and folders stored?',
    answer:
      'Your saved conversions, folders, communities, and preferences remain locally in your browser storage. You can export your entire library as a .zip archive or delete history at any time.',
  },
  {
    question: 'Which export formats are supported?',
    answer:
      'You can copy raw LaTeX, open directly in Overleaf, print to PDF, or convert to Word (.docx), OpenDocument (.odt), Typst (.typ), Markdown (.md), and LaTeX Beamer presentations.',
  },
  {
    question: 'How does MCP batch conversion work?',
    answer:
      'Generate a local MCP key in Settings and register @opentex-app/mcp in Claude Code, Codex, Cursor, or Claude Desktop to run plan_conversion, convert_files, and get_job_status over folders of notes.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="border-t border-[#D2D2D7] bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:sticky lg:top-20 lg:col-span-5">
            <h2 className="font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] sm:text-4xl">
              Common questions.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6E6E73]">
              Details on Publik AI model routing, local privacy, exports, and MCP automation.
            </p>
            <div className="mt-6">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0071E3] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077ED]"
              >
                <span>Open Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="divide-y divide-[#E5E5EA] overflow-hidden rounded-xl border border-[#D2D2D7] bg-white lg:col-span-7">
            {FAQS.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={item.question}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FAFAFC]"
                  >
                    <span className="text-sm font-semibold text-[#1D1D1F]">{item.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#6E6E73] transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-[#0071E3]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm leading-relaxed text-[#6E6E73]">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
