'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  Cpu,
  Key,
  Terminal,
  Wrench,
} from 'lucide-react';

const TERMINAL_CMD = 'npx -y @opentex-app/mcp setup';

const CLAUDE_DESKTOP_JSON = `{
  "mcpServers": {
    "opentex": {
      "command": "npx",
      "args": ["-y", "@opentex-app/mcp"],
      "env": {
        "OPENTEX_API_KEY": "ot_live_your_key_here",
        "OPENTEX_MCP_URL": "http://localhost:3000/api/mcp"
      }
    }
  }
}`;

const CURSOR_JSON = `{
  "mcpServers": {
    "opentex": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer ot_live_your_key_here"
      }
    }
  }
}`;

const MCP_TOOLS = [
  {
    name: 'get_balance',
    summary: 'Inspect current plan, limits, and free unlimited status.',
    args: 'None',
    returns: '{ plan: "Free Unlimited", creditsLeft: "unlimited", pageLimit: 200, price: "$0" }',
  },
  {
    name: 'plan_conversion',
    summary: 'Estimate page count and confirm $0 cost before batch converting files.',
    args: 'files: Array<{ name?: string; fileName?: string; pages?: number }>',
    returns: '{ fileCount, pageCount, totalPages, cost: 0, free: true }',
  },
  {
    name: 'convert_files',
    summary: 'Convert handwritten images, scans, or PDFs into compiled LaTeX via Publik AI.',
    args: 'files, model ("professional" | "turbo"), settings?',
    returns: '{ jobId, results: Array<{ fileName, latex, provider }> }',
  },
  {
    name: 'get_job_status',
    summary: 'Poll or retrieve completion state and LaTeX outputs for a conversion job.',
    args: 'jobId: string',
    returns: '{ jobId, status: "completed", progress: 100 }',
  },
  {
    name: 'get_conversion_settings',
    summary: 'Fetch default LaTeX style, preset, and available Publik AI models.',
    args: 'None',
    returns: '{ defaults: ConversionSettings, models: ["professional", "turbo"] }',
  },
];

export default function McpGuidePage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clientTab, setClientTab] = useState<'claude' | 'cursor'>('claude');
  const [origin, setOrigin] = useState('http://localhost:3000');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const claudeJson = CLAUDE_DESKTOP_JSON.replace('http://localhost:3000', origin);
  const cursorJson = CURSOR_JSON.replace('http://localhost:3000', origin);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#0071E3]/10 px-2.5 py-1 text-xs font-medium text-[#0071E3]">
            100% Free Unlimited · Local HTTP MCP Endpoint
          </div>
          <h1 className="mt-2 font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
            OpenTEX MCP Guide
          </h1>
          <p className="mt-1 text-sm text-[#6E6E73] dark:text-[#A1A1A6]">
            Connect Claude Code, Claude Desktop, Cursor, or Codex to OpenTEX&apos;s built-in <code className="font-mono text-xs">/api/mcp</code> endpoint.
          </p>
        </div>
        <Link
          href="/app/settings#connections"
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#0071E3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077ED]"
        >
          <Key className="h-4 w-4" />
          Manage API Keys
        </Link>
      </div>

      {/* Step 1 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0071E3] text-xs font-bold text-white">
            1
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Create an API key
          </h2>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Open{' '}
          <Link href="/app/settings#connections" className="font-medium text-[#0071E3] hover:underline">
            Settings → Connections (Local MCP Labels)
          </Link>{' '}
          and click <strong>Create key</strong> to generate a client <code className="font-mono text-xs">ot_live_…</code> token.
        </p>
      </section>

      {/* Step 2 */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0071E3] text-xs font-bold text-white">
            2
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Add it to your assistant
          </h2>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-500 uppercase">
            Quick CLI Setup (when running @opentex-app/mcp)
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3 font-mono text-xs text-slate-100">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Terminal className="h-4 w-4 shrink-0 text-sky-400" />
              <span>{TERMINAL_CMD}</span>
            </div>
            <button
              type="button"
              onClick={() => copyText('cmd', TERMINAL_CMD)}
              className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/20"
            >
              {copiedId === 'cmd' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedId === 'cmd' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setClientTab('claude')}
                className={`rounded-md px-3 py-1.5 ${
                  clientTab === 'claude'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500'
                }`}
              >
                Claude Desktop
              </button>
              <button
                type="button"
                onClick={() => setClientTab('cursor')}
                className={`rounded-md px-3 py-1.5 ${
                  clientTab === 'cursor'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500'
                }`}
              >
                Cursor (.cursor/mcp.json)
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                copyText(
                  clientTab,
                  clientTab === 'claude' ? claudeJson : cursorJson
                )
              }
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              {copiedId === clientTab ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copiedId === clientTab ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-sky-200">
            {clientTab === 'claude' ? claudeJson : cursorJson}
          </pre>
        </div>
      </section>

      {/* Step 3 */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0071E3] text-xs font-bold text-white">
            3
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Ask for it in plain language
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
          {[
            '“Convert every handwritten JPEG in ~/Notes/RealAnalysis into clean LaTeX using the Professional model and save .tex files to ./chapters.”',
            '“Plan a batch conversion for all PDFs in ./ProblemSets, check my settings, and convert them with Turbo mode.”',
          ].map((prompt, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              {prompt}
            </div>
          ))}
        </div>
      </section>

      {/* Models & Free Unlimited Status */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-[#0071E3]" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Models & Free Unlimited Status
          </h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="text-xs font-semibold text-emerald-700 uppercase dark:text-emerald-400">
              Pricing
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">$0 · Unlimited</div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Zero credit packs, zero paywalls, up to 200 pages per batch request.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="text-xs font-semibold text-[#0071E3] uppercase">
              Professional
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
              publik-smart
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Best for handwritten math, multi-step proofs, tables, and TikZ diagrams.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="text-xs font-semibold text-[#0071E3] uppercase">
              Turbo
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
              publik-fast
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              High-throughput model ideal for clean typeset PDFs and quick drafts.
            </p>
          </div>
        </div>
      </section>

      {/* 5 MCP Tools Reference */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-[#0071E3]" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            5 MCP Tools Reference
          </h2>
        </div>
        <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {MCP_TOOLS.map((tool) => (
            <div key={tool.name} className="space-y-1.5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <code className="rounded-md bg-[#0071E3]/10 px-2 py-0.5 font-mono text-xs font-semibold text-[#0071E3]">
                  {tool.name}
                </code>
                <span className="font-mono text-[11px] text-slate-500">
                  args: {tool.args}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">{tool.summary}</p>
              <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                → {tool.returns}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
