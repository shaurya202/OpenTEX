'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  CheckCircle2,
  ChevronUp,
  Lightbulb,
  Plus,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import {
  getAppPreferences,
  getFeedbackRequests,
  saveAppPreferences,
  saveFeedbackRequests,
  SEED_FEEDBACK,
} from '@/lib/storage';
import { FeedbackRequest } from '@/types/mathwrite';

type ComparisonId = 'angle' | 'light' | 'clutter' | 'spacing';

const PHOTO_COMPARISONS: Array<{
  id: ComparisonId;
  title: string;
  avoidTitle: string;
  avoidDesc: string;
  doTitle: string;
  doDesc: string;
}> = [
  {
    id: 'angle',
    title: 'Orientation & Framing',
    avoidTitle: 'Tilted or upside-down angle',
    avoidDesc: 'Shooting at a steep perspective warps fractions, subscripts, and matrix rows.',
    doTitle: 'Flat, overhead 90° capture',
    doDesc: 'Hold your phone parallel to the page so baselines stay horizontal and crisp.',
  },
  {
    id: 'light',
    title: 'Lighting & Contrast',
    avoidTitle: 'Harsh phone shadow or glare',
    avoidDesc: 'Direct flash or overhead shadows obscure light pencil strokes and integral limits.',
    doTitle: 'Even, diffused daylight',
    doDesc: 'Use indirect desk lighting with high ink-to-paper contrast.',
  },
  {
    id: 'clutter',
    title: 'Distractors & Clutter',
    avoidTitle: 'Fingers, pens, or other pages',
    avoidDesc: 'Extra objects or neighboring notebook margins confuse layout segmentation.',
    doTitle: 'Clean, cropped page edges',
    doDesc: 'Frame only the math content you want converted into LaTeX.',
  },
  {
    id: 'spacing',
    title: 'Handwriting Presentation',
    avoidTitle: 'Cramped lines & heavy scribbles',
    avoidDesc: 'Overlapping exponents and crossed-out blocks reduce symbol accuracy.',
    doTitle: 'Clear spacing between steps',
    doDesc: 'Leave brief breathing room around display equations and section headers.',
  },
];

function PhotoComparisonGraphic({ id, variant }: { id: ComparisonId; variant: 'avoid' | 'do' }) {
  const accent = variant === 'avoid' ? '#e11d48' : '#059669';
  return (
    <svg
      viewBox="0 0 140 54"
      aria-hidden="true"
      className="my-2 h-14 w-full rounded-md border border-slate-200/80 bg-white dark:border-slate-700/60 dark:bg-slate-950"
    >
      {id === 'angle' && variant === 'avoid' && (
        <g>
          <polygon points="28,8 122,16 108,48 16,42" fill="#f8fafc" stroke={accent} strokeWidth="1.5" />
          <line x1="34" y1="22" x2="104" y2="27" stroke="#64748b" strokeWidth="1.5" />
          <line x1="30" y1="33" x2="96" y2="37" stroke="#64748b" strokeWidth="1.5" />
        </g>
      )}
      {id === 'angle' && variant === 'do' && (
        <g>
          <rect x="22" y="8" width="96" height="38" rx="3" fill="#f8fafc" stroke={accent} strokeWidth="1.5" />
          <line x1="34" y1="20" x2="104" y2="20" stroke="#334155" strokeWidth="1.8" />
          <line x1="34" y1="31" x2="92" y2="31" stroke="#334155" strokeWidth="1.8" />
        </g>
      )}
      {id === 'light' && variant === 'avoid' && (
        <g>
          <rect x="18" y="8" width="104" height="38" rx="3" fill="#e2e8f0" />
          <path d="M18,8 L84,8 L52,46 L18,46 Z" fill="#94a3b8" opacity="0.7" />
          <line x1="32" y1="22" x2="102" y2="22" stroke="#475569" strokeWidth="1.5" />
          <line x1="32" y1="32" x2="90" y2="32" stroke="#475569" strokeWidth="1.5" />
        </g>
      )}
      {id === 'light' && variant === 'do' && (
        <g>
          <rect x="18" y="8" width="104" height="38" rx="3" fill="#ffffff" stroke={accent} strokeWidth="1.4" />
          <line x1="32" y1="21" x2="102" y2="21" stroke="#0f172a" strokeWidth="2" />
          <line x1="32" y1="32" x2="90" y2="32" stroke="#0f172a" strokeWidth="2" />
        </g>
      )}
      {id === 'clutter' && variant === 'avoid' && (
        <g>
          <rect x="24" y="8" width="84" height="38" rx="3" fill="#ffffff" stroke="#cbd5e1" />
          <line x1="34" y1="22" x2="90" y2="22" stroke="#334155" strokeWidth="1.5" />
          <rect x="98" y="14" width="26" height="6" rx="3" transform="rotate(24 98 14)" fill={accent} opacity="0.85" />
          <circle cx="24" cy="39" r="7" fill={accent} opacity="0.65" />
        </g>
      )}
      {id === 'clutter' && variant === 'do' && (
        <g>
          <rect x="20" y="7" width="100" height="40" rx="3" fill="#ffffff" stroke={accent} strokeWidth="1.6" strokeDasharray="4 2" />
          <line x1="34" y1="21" x2="102" y2="21" stroke="#0f172a" strokeWidth="1.8" />
          <line x1="34" y1="32" x2="88" y2="32" stroke="#0f172a" strokeWidth="1.8" />
        </g>
      )}
      {id === 'spacing' && variant === 'avoid' && (
        <g stroke="#334155" strokeWidth="1.4" fill="none">
          <path d="M26 20 Q45 14 68 22 T112 20" />
          <path d="M26 24 Q50 28 80 21 T112 26" />
          <path d="M35 32 L105 32" stroke={accent} strokeWidth="2" />
        </g>
      )}
      {id === 'spacing' && variant === 'do' && (
        <g>
          <line x1="28" y1="16" x2="108" y2="16" stroke="#0f172a" strokeWidth="1.8" />
          <line x1="28" y1="28" x2="96" y2="28" stroke="#0f172a" strokeWidth="1.8" />
          <line x1="28" y1="40" x2="104" y2="40" stroke="#0f172a" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
}

export default function HelpPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<FeedbackRequest[]>(SEED_FEEDBACK);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [submittedNotice, setSubmittedNotice] = useState(false);

  useEffect(() => {
    setRequests(getFeedbackRequests());
  }, []);

  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => b.votes - a.votes),
    [requests]
  );

  const toggleVote = (id: string) => {
    const next = requests.map((item) => {
      if (item.id !== id) return item;
      const voted = !item.voted;
      return {
        ...item,
        voted,
        votes: voted ? item.votes + 1 : Math.max(0, item.votes - 1),
      };
    });
    setRequests(next);
    saveFeedbackRequests(next);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const item: FeedbackRequest = {
      id: `fb-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Community feature suggestion.',
      votes: 1,
      voted: true,
      status: 'Planned',
      author: author.trim() || 'You',
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...requests];
    setRequests(next);
    saveFeedbackRequests(next);
    setTitle('');
    setDescription('');
    setAuthor('');
    setSubmittedNotice(true);
    setTimeout(() => setSubmittedNotice(false), 2500);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
            Help, Photo Tips &amp; Feature Requests
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Get near-100% LaTeX accuracy from handwritten notes and vote on what OpenTEX builds next.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const prefs = getAppPreferences();
            saveAppPreferences({ ...prefs, onboardingCompleted: false });
            router.push('/app');
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D2D2D7] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:text-[#F5F5F7] dark:hover:bg-[#2C2C2E]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Replay setup guide</span>
        </button>
      </div>

      {/* Perfect Photo Guide */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-[#0071E3]/10 p-2 text-[#0071E3]">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Tips for Best Photo Results
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Follow the Perfect Photo checklist before uploading to Professional or Turbo mode.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0071E3]/10 px-3 py-1 text-xs font-medium text-[#0071E3]">
            Perfect Photo Guide
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[#0071E3]/20 bg-[#0071E3]/5 p-4 text-xs text-slate-800 sm:grid-cols-4 dark:text-slate-200">
          <div>
            <strong>1. Lay page flat</strong>
            <p className="mt-0.5 opacity-80">Press down notebook spines so equations stay level.</p>
          </div>
          <div>
            <strong>2. Overhead 90° shot</strong>
            <p className="mt-0.5 opacity-80">Keep camera parallel to paper; avoid keystone tilt.</p>
          </div>
          <div>
            <strong>3. Bright, even light</strong>
            <p className="mt-0.5 opacity-80">Avoid phone shadows across integrals and fractions.</p>
          </div>
          <div>
            <strong>4. Crop cleanly</strong>
            <p className="mt-0.5 opacity-80">Exclude desks, hands, and unrelated margin doodles.</p>
          </div>
        </div>

        {/* Do this vs Avoid cards */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {PHOTO_COMPARISONS.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{card.title}</h3>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/50 dark:bg-rose-950/30">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    <XCircle className="h-3.5 w-3.5" />
                    Avoid
                  </div>
                  <PhotoComparisonGraphic id={card.id} variant="avoid" />
                  <div className="mt-1 text-xs font-medium text-slate-900 dark:text-white">
                    {card.avoidTitle}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    {card.avoidDesc}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Do this
                  </div>
                  <PhotoComparisonGraphic id={card.id} variant="do" />
                  <div className="mt-1 text-xs font-medium text-slate-900 dark:text-white">
                    {card.doTitle}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    {card.doDesc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Requests & Voting Board */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-[#0071E3]" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Feature Requests &amp; Voting Board
                </h2>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Local preview board · Votes and requests are saved in this browser.
              </p>
            </div>
            <span className="text-xs text-slate-500">{sortedRequests.length} requests</span>
          </div>

          <div className="space-y-3">
            {sortedRequests.map((item) => {
              const statusStyle =
                item.status === 'Shipped'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : item.status === 'In Progress'
                  ? 'bg-[#0071E3]/10 text-[#0071E3]'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3.5 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <button
                    type="button"
                    onClick={() => toggleVote(item.id)}
                    aria-label={`Vote for ${item.title}`}
                    aria-pressed={item.voted}
                    className={`flex min-w-[52px] flex-col items-center rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                      item.voted
                        ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                    }`}
                  >
                    <ChevronUp className="h-4 w-4" />
                    <span className="tabular-nums">{item.votes}</span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${statusStyle}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.description}
                    </p>
                    <div className="mt-2 text-[11px] text-slate-500">
                      Requested by {item.author} · {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit New Request */}
        <form
          onSubmit={handleSubmitRequest}
          className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5"
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Submit a Feature Request
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tell us what would make your LaTeX or STEM workflow faster.
          </p>

          {submittedNotice && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              Request added to the voting board!
            </div>
          )}

          <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Title</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Support Feynman diagram TikZ export"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Description</span>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the use case or expected output…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Your name (optional)</span>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Ada Lovelace"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0071E3] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0077ED]"
          >
            <Plus className="h-4 w-4" />
            Submit Request
          </button>
        </form>
      </section>
    </div>
  );
}
