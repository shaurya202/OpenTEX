'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, Terminal } from 'lucide-react';

const CLIENTS = ['Claude Code', 'Codex', 'Cursor', 'Claude Desktop'];

const MCP_STEPS = [
  {
    num: '1',
    title: 'Create an MCP key',
    desc: 'Generate a local token in Settings with zero rate or page caps.',
  },
  {
    num: '2',
    title: 'Register the endpoint',
    desc: 'Run the setup command or add the JSON server entry to Claude Desktop or Cursor.',
  },
  {
    num: '3',
    title: 'Convert whole folders',
    desc: 'Ask your coding or research agent to turn an entire directory of PDFs into .tex files.',
  },
];

export function McpSection() {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const setupCmd = 'npx -y @opentex-app/mcp setup';

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(setupCmd);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 1800);
    } catch {
      setCopiedCmd(false);
    }
  };

  return (
    <section id="mcp" className="border-t border-[#D2D2D7] bg-[#F5F5F7] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 className="font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] sm:text-4xl">
              Batch-convert entire folders from your coding agent.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6E6E73]">
              Connect OpenTEX directly to your local MCP client to convert directories of scanned notes and PDFs without leaving your terminal.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {CLIENTS.map((client) => (
                <span
                  key={client}
                  className="rounded-md border border-[#D2D2D7] bg-white px-2.5 py-1 text-xs font-medium text-[#1D1D1F]"
                >
                  {client}
                </span>
              ))}
            </div>

            <ol className="mt-8 space-y-5">
              {MCP_STEPS.map((step) => (
                <li key={step.num} className="flex items-start gap-3.5">
                  <span className="tabular-nums font-mono flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1D1D1F] text-xs font-medium text-white">
                    {step.num}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1D1D1F]">{step.title}</h3>
                    <p className="mt-0.5 text-sm text-[#6E6E73]">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8">
              <Link
                href="/app/mcp-guide"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0071E3] hover:underline"
              >
                <span>Read the MCP setup guide</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-xl border border-[#2C2C2E] bg-[#161618] text-[#F5F5F7] shadow-sm">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-[#8E8E93]" />
                  <span className="font-mono text-xs text-[#A1A1A6]">~/Notes &middot; Claude Code</span>
                </div>
                <button
                  type="button"
                  onClick={copyCommand}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#F5F5F7] hover:bg-white/10"
                >
                  {copiedCmd ? <Check className="h-3 w-3 text-[#30D158]" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="font-mono space-y-4 p-5 text-xs leading-relaxed sm:text-[13px]">
                <div>
                  <span className="text-[#30D158]">$</span>{' '}
                  <span className="text-white">{setupCmd}</span>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[#A1A1A6]">
                    <Check className="h-3.5 w-3.5 text-[#30D158]" />
                    <span>Registered @opentex-app/mcp</span>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-[#F5F5F7]">
                  <span className="text-[#64D2FF]">&gt;</span> Convert all PDFs in ./analysis-hw to LaTeX
                </div>

                <div className="space-y-2">
                  {[
                    { name: 'plan_conversion', meta: '3 PDFs, 24 pages, Free' },
                    { name: 'convert_files', meta: 'Publik AI batch queue' },
                    { name: 'get_job_status', meta: '3/3 .tex files saved' },
                  ].map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <div>
                        <span className="text-[#64D2FF]">{row.name}</span>
                        <span className="text-[#8E8E93]"> &middot; {row.meta}</span>
                      </div>
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#30D158]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
