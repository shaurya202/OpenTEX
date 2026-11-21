'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  Globe,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { renderLatexDocument } from '@/lib/latex-renderer';
import { downloadConvertedDocument, openInOverleaf } from '@/lib/exporters';
import {
  getCommunities,
  getConversions,
  getSettings,
  saveCommunities,
  SEED_COMMUNITIES,
  SEED_CONVERSIONS,
} from '@/lib/storage';
import {
  Community,
  ConversionItem,
  DEFAULT_CONVERSION_SETTINGS,
  LatexThemeStyle,
} from '@/types/mathwrite';

function randomInviteCode() {
  return `ot-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>(SEED_COMMUNITIES);
  const [conversions, setConversions] = useState<ConversionItem[]>(SEED_CONVERSIONS);
  const [latexStyle, setLatexStyle] = useState<LatexThemeStyle>(DEFAULT_CONVERSION_SETTINGS.latexStyle);

  const [tab, setTab] = useState<'created' | 'joined'>('created');
  const [activeCommunityId, setActiveCommunityId] = useState<string>(SEED_COMMUNITIES[0].id);
  const [selectedConversionId, setSelectedConversionId] = useState<string | null>(
    SEED_COMMUNITIES[0].conversionIds[0] ?? null
  );

  // Create community modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMode, setNewMode] = useState<'readonly' | 'open'>('open');

  // Add conversion modal
  const [addConvOpen, setAddConvOpen] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [inviteBanner, setInviteBanner] = useState<string | null>(null);
  const [confirmRemoveCommId, setConfirmRemoveCommId] = useState<string | null>(null);

  useEffect(() => {
    const loadedComms = getCommunities();
    const loadedConvs = getConversions();
    setCommunities(loadedComms);
    setConversions(loadedConvs);
    setLatexStyle(getSettings().latexStyle);

    const invite = new URLSearchParams(window.location.search).get('invite')?.trim();
    if (invite) {
      const existing = loadedComms.find((c) => c.inviteCode === invite);
      if (existing) {
        setTab(existing.isOwner ? 'created' : 'joined');
        setActiveCommunityId(existing.id);
        setSelectedConversionId(existing.conversionIds[0] ?? null);
        setInviteBanner(`Opened "${existing.name}" via invite link.`);
        return;
      }
      const joined: Community = {
        id: `comm-invite-${Date.now()}`,
        name: `Study Group (${invite.slice(0, 9)})`,
        description: 'Joined locally via community invite link (saved in your browser).',
        mode: 'open',
        inviteCode: invite,
        memberCount: 1,
        isOwner: false,
        conversionIds: [],
      };
      const next = [joined, ...loadedComms];
      setCommunities(next);
      saveCommunities(next);
      setTab('joined');
      setActiveCommunityId(joined.id);
      setSelectedConversionId(null);
      setInviteBanner(`Joined local study group "${joined.name}". Add conversions to collaborate.`);
      return;
    }

    if (loadedComms.length > 0) {
      const firstCreated = loadedComms.find((c) => c.isOwner) || loadedComms[0];
      setTab(firstCreated.isOwner ? 'created' : 'joined');
      setActiveCommunityId(firstCreated.id);
      setSelectedConversionId(firstCreated.conversionIds[0] ?? null);
    }
  }, []);

  const createdCommunities = useMemo(
    () => communities.filter((c) => c.isOwner),
    [communities]
  );
  const joinedCommunities = useMemo(
    () => communities.filter((c) => !c.isOwner),
    [communities]
  );

  const visibleCommunities = tab === 'created' ? createdCommunities : joinedCommunities;

  const activeCommunity = useMemo(
    () =>
      visibleCommunities.find((c) => c.id === activeCommunityId) ||
      visibleCommunities[0] ||
      null,
    [visibleCommunities, activeCommunityId]
  );

  const sharedConversions = useMemo(() => {
    if (!activeCommunity) return [];
    return activeCommunity.conversionIds
      .map((id) => conversions.find((c) => c.id === id))
      .filter((c): c is ConversionItem => Boolean(c));
  }, [activeCommunity, conversions]);

  const previewConversion = useMemo(
    () =>
      sharedConversions.find((c) => c.id === selectedConversionId) ||
      sharedConversions[0] ||
      null,
    [sharedConversions, selectedConversionId]
  );

  const renderedHtml = useMemo(
    () => (previewConversion ? renderLatexDocument(previewConversion.latex, { latexStyle }) : ''),
    [previewConversion, latexStyle]
  );

  const handleCreateCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created: Community = {
      id: `comm-${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim() || 'Shared OpenTEX study group and LaTeX notes.',
      mode: newMode,
      inviteCode: randomInviteCode(),
      memberCount: 1,
      isOwner: true,
      conversionIds: [],
    };
    const next = [created, ...communities];
    setCommunities(next);
    saveCommunities(next);
    setTab('created');
    setActiveCommunityId(created.id);
    setSelectedConversionId(null);
    setNewName('');
    setNewDesc('');
    setNewMode('open');
    setCreateOpen(false);
  };

  const handleCopyInvite = async () => {
    if (!activeCommunity) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://opentex.app';
    const url = `${origin}/app/communities?invite=${activeCommunity.inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 1800);
    } catch {
      setInviteBanner(`Invite link: ${url}`);
    }
  };

  const handleDeleteOrLeaveCommunity = (commId: string) => {
    const next = communities.filter((c) => c.id !== commId);
    setCommunities(next);
    saveCommunities(next);
    setConfirmRemoveCommId(null);
    const nextVisible = next.filter((c) => (tab === 'created' ? c.isOwner : !c.isOwner));
    setActiveCommunityId(nextVisible[0]?.id ?? '');
    setSelectedConversionId(nextVisible[0]?.conversionIds[0] ?? null);
  };

  const handleRegenerateInvite = () => {
    if (!activeCommunity) return;
    const next = communities.map((c) =>
      c.id === activeCommunity.id ? { ...c, inviteCode: randomInviteCode() } : c
    );
    setCommunities(next);
    saveCommunities(next);
  };

  const handleAddConversion = (convId: string) => {
    if (!activeCommunity) return;
    const next = communities.map((c) => {
      if (c.id !== activeCommunity.id) return c;
      if (c.conversionIds.includes(convId)) return c;
      return { ...c, conversionIds: [convId, ...c.conversionIds] };
    });
    setCommunities(next);
    saveCommunities(next);
    setSelectedConversionId(convId);
    setAddConvOpen(false);
  };

  const handleRemoveShared = (convId: string) => {
    if (!activeCommunity) return;
    const next = communities.map((c) =>
      c.id === activeCommunity.id
        ? { ...c, conversionIds: c.conversionIds.filter((id) => id !== convId) }
        : c
    );
    setCommunities(next);
    saveCommunities(next);
    if (selectedConversionId === convId) setSelectedConversionId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
            Communities
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Share LaTeX lecture notes, theorem sheets, and study packs with classmates for free.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0071E3] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0077ED]"
        >
          <Plus className="h-4 w-4" />
          New community
        </button>
      </div>

      {inviteBanner && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span>{inviteBanner}</span>
          <button type="button" onClick={() => setInviteBanner(null)} aria-label="Dismiss notice">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs + Main Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* Left List */}
        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <div className="mb-4 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => {
                setTab('created');
                setConfirmRemoveCommId(null);
                setActiveCommunityId(createdCommunities[0]?.id ?? '');
                setSelectedConversionId(createdCommunities[0]?.conversionIds[0] ?? null);
              }}
              className={`rounded-lg py-2 transition ${
                tab === 'created'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Created by you ({createdCommunities.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('joined');
                setConfirmRemoveCommId(null);
                setActiveCommunityId(joinedCommunities[0]?.id ?? '');
                setSelectedConversionId(joinedCommunities[0]?.conversionIds[0] ?? null);
              }}
              className={`rounded-lg py-2 transition ${
                tab === 'joined'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Joined ({joinedCommunities.length})
            </button>
          </div>

          <div className="space-y-2">
            {visibleCommunities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                No communities in this tab yet.
              </div>
            ) : (
              visibleCommunities.map((comm) => {
                const active = activeCommunity?.id === comm.id;
                return (
                  <button
                    key={comm.id}
                    type="button"
                    onClick={() => {
                      setActiveCommunityId(comm.id);
                      setConfirmRemoveCommId(null);
                      setSelectedConversionId(comm.conversionIds[0] ?? null);
                    }}
                    className={`w-full rounded-xl border p-3.5 text-left transition ${
                      active
                        ? 'border-[#0071E3] bg-[#0071E3]/10'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-900 dark:text-white">{comm.name}</div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {comm.mode === 'open' ? (
                          <Globe className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Lock className="h-3 w-3 text-[#6E6E73]" />
                        )}
                        {comm.mode === 'open' ? 'Open' : 'Read-only'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {comm.description}
                    </p>
                    <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {comm.memberCount} {comm.memberCount === 1 ? 'member' : 'members'}
                      </span>
                      <span>
                        {comm.conversionIds.length}{' '}
                        {comm.conversionIds.length === 1 ? 'document' : 'documents'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Community Workspace */}
        <section className="space-y-4 lg:col-span-8">
          {activeCommunity ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {activeCommunity.name}
                      </h2>
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Users className="h-3.5 w-3.5 text-[#0071E3]" />
                        {activeCommunity.memberCount}{' '}
                        {activeCommunity.memberCount === 1 ? 'member' : 'members'}
                      </span>
                      <span className="rounded-md bg-[#0071E3]/10 px-2.5 py-0.5 text-xs font-medium text-[#0071E3]">
                        {activeCommunity.mode === 'open' ? 'Everyone (Open)' : 'Only me (Read-only)'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                      {activeCommunity.description}
                    </p>
                    <div className="mt-2 text-xs text-slate-500">
                      Invite code:{' '}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {activeCommunity.inviteCode}
                      </code>{' '}
                      <span className="text-[11px] text-slate-400">· Saved locally in your browser</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyInvite}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    >
                      {copiedInvite ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedInvite ? 'Invite Copied' : 'Copy invite link'}
                    </button>
                    {activeCommunity.isOwner && (
                      <button
                        type="button"
                        onClick={handleRegenerateInvite}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        New invite link
                      </button>
                    )}
                    {(activeCommunity.isOwner || activeCommunity.mode === 'open') && (
                      <button
                        type="button"
                        onClick={() => setAddConvOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0071E3] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0077ED]"
                      >
                        <FilePlus2 className="h-3.5 w-3.5" />
                        Add conversion
                      </button>
                    )}
                    {confirmRemoveCommId === activeCommunity.id ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs dark:border-rose-900 dark:bg-rose-950/50">
                        <span className="font-medium text-rose-800 dark:text-rose-200">
                          {activeCommunity.isOwner ? 'Delete?' : 'Leave?'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrLeaveCommunity(activeCommunity.id)}
                          className="rounded bg-rose-600 px-2 py-0.5 font-semibold text-white hover:bg-rose-500"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveCommId(null)}
                          className="px-1 text-slate-600 hover:underline dark:text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveCommId(activeCommunity.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {activeCommunity.isOwner ? 'Delete' : 'Leave'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Shared Conversions + Interactive Preview */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 xl:col-span-5">
                  <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Shared Conversions ({sharedConversions.length})
                  </h3>
                  {sharedConversions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                      No conversions shared yet. Click “Add conversion” to publish notes here.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sharedConversions.map((conv) => {
                        const active = previewConversion?.id === conv.id;
                        return (
                          <div
                            key={conv.id}
                            className={`flex items-center justify-between rounded-xl border p-3 transition ${
                              active
                                ? 'border-blue-500 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/30'
                                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedConversionId(conv.id)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                {conv.title}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                {conv.fileType} · {conv.pages} page{conv.pages === 1 ? '' : 's'}
                              </div>
                            </button>
                            {(activeCommunity.isOwner || activeCommunity.mode === 'open') && (
                              <button
                                type="button"
                                title="Remove from community"
                                onClick={() => handleRemoveShared(conv.id)}
                                className="ml-2 rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 xl:col-span-7">
                  {previewConversion ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {previewConversion.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              downloadConvertedDocument(
                                previewConversion.latex,
                                'tex',
                                previewConversion.title
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download .tex
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openInOverleaf(previewConversion.latex, previewConversion.title)
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open in Overleaf
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[520px] overflow-auto bg-slate-100/70 p-4 dark:bg-slate-950/40">
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                          <div
                            className="latex-compiled-doc text-sm"
                            dangerouslySetInnerHTML={{ __html: renderedHtml }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[320px] items-center justify-center p-8 text-sm text-slate-500">
                      Select a shared conversion to preview its compiled LaTeX.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              Select or create a community to get started.
            </div>
          )}
        </section>
      </div>

      {/* Create Community Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleCreateCommunity}
            className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                New Community
              </h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Name</span>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Differential Geometry Study Group"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Description</span>
              <textarea
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What notes or courses will members share here?"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <div className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Permissions</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewMode('readonly')}
                  className={`rounded-xl border p-2.5 text-left ${
                    newMode === 'readonly'
                      ? 'border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="font-semibold">Only me (Read-only)</div>
                  <div className="mt-0.5 text-[11px] opacity-75">Members can view & export</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewMode('open')}
                  className={`rounded-xl border p-2.5 text-left ${
                    newMode === 'open'
                      ? 'border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="font-semibold">Everyone (Open)</div>
                  <div className="mt-0.5 text-[11px] opacity-75">All members can contribute</div>
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#0071E3] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0077ED]"
              >
                Create Community
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Conversion Modal */}
      {addConvOpen && activeCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Add Conversion to {activeCommunity.name}
              </h3>
              <button
                type="button"
                onClick={() => setAddConvOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {conversions.map((conv) => {
                const added = activeCommunity.conversionIds.includes(conv.id);
                return (
                  <button
                    key={conv.id}
                    type="button"
                    disabled={added}
                    onClick={() => handleAddConversion(conv.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-400 disabled:opacity-50 dark:border-slate-800"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{conv.title}</div>
                      <div className="text-xs text-slate-500">{conv.fileName}</div>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {added ? 'Added' : 'Add'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
