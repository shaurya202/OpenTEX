'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  Server,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { testPublikConnection } from '@/lib/publik';
import { downloadLatexZip } from '@/lib/exporters';
import {
  clearAllConversions,
  DEFAULT_APP_PREFERENCES,
  DEFAULT_PUBLIK_CONFIG,
  getApiKeys,
  getAppPreferences,
  getConversions,
  getPublikConfig,
  getSettings,
  saveApiKeys,
  saveAppPreferences,
  savePublikConfig,
  saveSettings,
  SEED_API_KEYS,
} from '@/lib/storage';
import {
  ApiKeyItem,
  AppPreferences,
  ConversionSettings,
  DEFAULT_CONVERSION_SETTINGS,
  EDITOR_PALETTES,
  EditorPalette,
  LatexThemeStyle,
  NOTES_LANGUAGES,
  PRESET_LABELS,
  PRESET_SETTINGS,
  PublikConfig,
} from '@/types/mathwrite';

export default function SettingsPage() {
  const [publikConfig, setPublikConfig] = useState<PublikConfig>(DEFAULT_PUBLIK_CONFIG);
  const [showApiKey, setShowApiKey] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<{
    ok: boolean;
    provider: string;
    model: string;
    message: string;
  } | null>(null);

  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_CONVERSION_SETTINGS);
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_APP_PREFERENCES);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(SEED_API_KEYS);
  const [publikStatus, setPublikStatus] = useState<{
    choice?: 'publik' | 'own_key' | null;
    hasAppToken?: boolean;
    wallet?: {
      handle?: string | null;
      plan?: { kind: string; label: string | null };
      used_percent?: number | null;
      remaining_percent?: number | null;
      prepaid_remaining_percent?: number | null;
      top_up_url?: string | null;
    } | null;
  } | null>(null);
  const [choiceBusy, setChoiceBusy] = useState(false);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  // Create API key modal
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Delete history confirmation
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearedBanner, setClearedBanner] = useState(false);

  useEffect(() => {
    setPublikConfig(getPublikConfig());
    setSettings(getSettings());
    setPrefs(getAppPreferences());
    setApiKeys(getApiKeys());
    fetch('/api/publik/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setPublikStatus(d))
      .catch(() => {});
  }, []);

  const handleUpdateChoice = async (choice: 'publik' | 'own_key' | null) => {
    setChoiceBusy(true);
    try {
      const res = await fetch('/api/publik/status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'set_choice', choice }),
      });
      const d = await res.json();
      setPublikStatus(d);
      if (choice === 'own_key' && !publikConfig.apiKey.trim()) {
        setTimeout(() => apiKeyInputRef.current?.focus(), 50);
      }
    } finally {
      setChoiceBusy(false);
    }
  };

  const handleSavePublik = (e: React.FormEvent) => {
    e.preventDefault();
    savePublikConfig(publikConfig);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    try {
      savePublikConfig(publikConfig);
      const res = await testPublikConnection(publikConfig);
      setConnResult(res);
    } catch (err) {
      setConnResult({
        ok: false,
        provider: 'publik-local-fallback',
        model: publikConfig.professionalModel,
        message: err instanceof Error ? err.message : 'Connection check failed; local fallback active.',
      });
    } finally {
      setTestingConn(false);
    }
  };

  const updateSettings = (patch: Partial<ConversionSettings>, markCustom = false) => {
    const next: ConversionSettings = {
      ...settings,
      ...patch,
      ...(markCustom ? { preset: 'custom' } : {}),
    };
    setSettings(next);
    saveSettings(next);
  };

  const applyPreset = (preset: 'faithful' | 'balanced' | 'professional') => {
    const next: ConversionSettings = {
      ...settings,
      ...PRESET_SETTINGS[preset],
      preset,
    };
    setSettings(next);
    saveSettings(next);
  };

  const updatePrefs = (patch: Partial<AppPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveAppPreferences(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mw-preferences-updated'));
    }
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const rawHex = `${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
    const fullKey = `ot_live_${rawHex}`;
    const maskedPrefix = `${fullKey.slice(0, 12)}...${fullKey.slice(-4)}`;
    const item: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim() || 'MCP Client Key',
      prefix: maskedPrefix,
      createdAt: new Date().toISOString(),
      lastUsed: null,
    };
    const next = [item, ...apiKeys];
    setApiKeys(next);
    saveApiKeys(next);
    setGeneratedKey(fullKey);
    setNewKeyName('');
  };

  const handleRevokeKey = (id: string) => {
    const next = apiKeys.filter((k) => k.id !== id);
    setApiKeys(next);
    saveApiKeys(next);
  };

  const handleDownloadZip = () => {
    const all = getConversions();
    downloadLatexZip(all);
  };

  const handleClearHistory = () => {
    clearAllConversions();
    setConfirmClear(false);
    setClearedBanner(true);
    setTimeout(() => setClearedBanner(false), 2500);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Configure Publik AI endpoints, default LaTeX preferences, editor syntax colours, and MCP API keys.
        </p>
      </div>

      {/* 0. Sign in with publik & AI Provider Choice */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Sign in with publik &amp; AI Provider
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {publikStatus?.wallet?.handle
                ? `Signed in as @${publikStatus.wallet.handle}`
                : publikStatus?.hasAppToken
                  ? 'Connected via publik module'
                  : 'Pre-publish local test mode (publik module ready)'}
              {typeof publikStatus?.wallet?.used_percent === 'number'
                ? ` · Plan used: ${publikStatus.wallet.used_percent}%`
                : typeof publikStatus?.wallet?.prepaid_remaining_percent === 'number'
                  ? ` · Prepaid remaining: ${publikStatus.wallet.prepaid_remaining_percent}%`
                  : ''}
            </p>
          </div>
          <span className="rounded-md bg-[#0071E3]/10 px-2.5 py-1 text-xs font-medium text-[#0071E3]">
            Active choice: {publikStatus?.choice === 'own_key' ? 'Use my own key' : 'publik API'}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={choiceBusy}
            onClick={() => void handleUpdateChoice('publik')}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              publikStatus?.choice !== 'own_key'
                ? 'bg-[#0071E3] text-white'
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            Use publik API
          </button>
          <button
            type="button"
            disabled={choiceBusy}
            onClick={() => void handleUpdateChoice('own_key')}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              publikStatus?.choice === 'own_key'
                ? 'bg-[#0071E3] text-white'
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            Use my own key
          </button>
          <button
            type="button"
            disabled={choiceBusy}
            onClick={() => void handleUpdateChoice(null)}
            className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            Reset choice
          </button>
        </div>
      </section>

      {/* 1. Custom / Own Key Configuration */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#0071E3]/10 p-2.5 text-[#0071E3]">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Custom Endpoint &amp; API Key
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Used automatically when &ldquo;Use my own key&rdquo; is selected above, or as a local key override.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0071E3]/10 px-3 py-1 text-xs font-medium text-[#0071E3]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Smart Local Fallback runs when no live key is active
          </span>
        </div>

        <form onSubmit={handleSavePublik} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Base URL</span>
              <input
                type="url"
                value={publikConfig.baseUrl}
                onChange={(e) => setPublikConfig({ ...publikConfig, baseUrl: e.target.value })}
                placeholder="https://publikhq.com/api/v1"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>API Key (optional)</span>
              <div className="relative">
                <input
                  ref={apiKeyInputRef}
                  type={showApiKey ? 'text' : 'password'}
                  autoComplete="off"
                  value={publikConfig.apiKey}
                  onChange={(e) => setPublikConfig({ ...publikConfig, apiKey: e.target.value })}
                  placeholder="pk_... or sk-... (optional with publik sign-in)"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Professional Model</span>
              <input
                type="text"
                value={publikConfig.professionalModel}
                onChange={(e) =>
                  setPublikConfig({ ...publikConfig, professionalModel: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Turbo Model</span>
              <input
                type="text"
                value={publikConfig.turboModel}
                onChange={(e) => setPublikConfig({ ...publikConfig, turboModel: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0071E3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077ED]"
            >
              {configSaved && <Check className="h-4 w-4" />}
              {configSaved ? 'Config Saved' : 'Save Config'}
            </button>
            <button
              type="button"
              disabled={testingConn}
              onClick={handleTestConnection}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {testingConn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-[#0071E3]" />}
              Test Connection
            </button>
          </div>

          {connResult && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs ${
                connResult.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
              }`}
            >
              <div className="font-semibold">
                {connResult.ok ? 'Connected to Publik AI' : 'Local Fallback Active (Not Connected to Live Endpoint)'} · Model:{' '}
                {connResult.model}
              </div>
              <div className="mt-0.5 opacity-90">{connResult.message}</div>
            </div>
          )}
        </form>
      </section>

      {/* 2. Default Conversion */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Default Conversion</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Choose defaults applied whenever you convert a new note, image, or PDF.
            </p>
          </div>
          {settings.preset === 'custom' && (
            <span className="rounded-md bg-[#0071E3]/10 px-2.5 py-0.5 text-xs font-medium text-[#0071E3]">
              Custom options active
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
              Default preset
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['faithful', 'balanced', 'professional'] as const).map((presetId) => (
                <button
                  key={presetId}
                  type="button"
                  onClick={() => applyPreset(presetId)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                    settings.preset === presetId
                      ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3]'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {PRESET_LABELS[presetId]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
              LaTeX style
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'standard', label: 'Classic' },
                  { id: 'tagged', label: 'Tagged' },
                  { id: 'boxed', label: 'Boxed' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updateSettings({ latexStyle: s.id as LatexThemeStyle })}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                    settings.latexStyle === s.id
                      ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3]'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Notes language</span>
            <select
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {NOTES_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              { key: 'title', label: 'Generate document title' },
              { key: 'toc', label: 'Table of contents' },
              { key: 'numbering', label: 'Equation numbering' },
              { key: 'images', label: 'Include embedded images' },
              { key: 'colours', label: 'Preserve note colors' },
            ] as const
          ).map((toggle) => (
            <label
              key={toggle.key}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300"
            >
              <span>{toggle.label}</span>
              <input
                type="checkbox"
                checked={Boolean(settings[toggle.key])}
                onChange={(e) => updateSettings({ [toggle.key]: e.target.checked }, true)}
                className="h-4 w-4 accent-[#0071E3]"
              />
            </label>
          ))}

          <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <span>Diagrams (TikZ)</span>
            <select
              value={settings.diagrams}
              onChange={(e) =>
                updateSettings({ diagrams: e.target.value as ConversionSettings['diagrams'] }, true)
              }
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="draw">Draw TikZ</option>
              <option value="placeholder">Placeholder</option>
              <option value="omit">Omit</option>
            </select>
          </label>
        </div>
      </section>

      {/* 3. Editor Colours */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Editor Colors</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Pick your preferred syntax highlighting palette across the Workspace, Tools, and Library.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(EDITOR_PALETTES) as EditorPalette[]).map((key) => {
            const p = EDITOR_PALETTES[key];
            const selected = prefs.editorPalette === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => updatePrefs({ editorPalette: key })}
                className={`overflow-hidden rounded-xl border text-left transition ${
                  selected
                    ? 'border-[#0071E3] ring-2 ring-[#0071E3]/30'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                }`}
              >
                <div
                  className="p-3 font-mono text-[11px] leading-5"
                  style={{ backgroundColor: p.bg, color: p.text }}
                >
                  <div>
                    <span style={{ color: p.gutter }}>1 </span>
                    <span style={{ color: p.comment }}>% Pythagorean Theorem</span>
                  </div>
                  <div>
                    <span style={{ color: p.gutter }}>2 </span>
                    <span style={{ color: p.command }}>\begin</span>
                    <span style={{ color: p.braces }}>{'{'}</span>
                    <span>equation</span>
                    <span style={{ color: p.braces }}>{'}'}</span>
                  </div>
                  <div>
                    <span style={{ color: p.gutter }}>3 </span>
                    <span style={{ color: p.math }}>a^2 + b^2 = c^2</span>
                  </div>
                  <div>
                    <span style={{ color: p.gutter }}>4 </span>
                    <span style={{ color: p.command }}>\end</span>
                    <span style={{ color: p.braces }}>{'{'}</span>
                    <span>equation</span>
                    <span style={{ color: p.braces }}>{'}'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-2 text-xs font-semibold text-slate-900 dark:bg-slate-950 dark:text-white">
                  <span>{p.name}</span>
                  {selected && (
                    <span className="inline-flex items-center gap-1 text-[#0071E3]">
                      <Check className="h-3.5 w-3.5" /> Active
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Connections (MCP API Keys) */}
      <section
        id="connections"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Connections (Local MCP Labels)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Generate client reference tokens stored locally in this browser for Claude Desktop, Cursor, or Codex.{' '}
              <Link href="/app/mcp-guide" className="font-medium text-[#0071E3] hover:underline">
                Read MCP Setup Guide →
              </Link>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setGeneratedKey(null);
              setCreateKeyOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0071E3] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0077ED]"
          >
            <Plus className="h-4 w-4" />
            Create key
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {apiKeys.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No API keys created yet.
            </div>
          ) : (
            apiKeys.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Key className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <code className="font-mono">{item.prefix}</code>
                      <span>· Created {new Date(item.createdAt).toLocaleDateString()}</span>
                      <span>
                        · {item.lastUsed ? `Last used ${new Date(item.lastUsed).toLocaleDateString()}` : 'Never used'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeKey(item.id)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 5. Account & Data */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Account & Data</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Your conversions are stored locally in your browser. Everything is 100% free with no limits.
        </p>

        {clearedBanner && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            Conversion history cleared.
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 dark:border-slate-800 dark:text-slate-200">
            <div>
              <div className="font-medium">Save my conversions</div>
              <div className="text-xs text-slate-500">
                Automatically store converted documents in My Conversions
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.saveHistory}
              onChange={(e) => updatePrefs({ saveHistory: e.target.checked })}
              className="h-4 w-4 accent-[#0071E3]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleDownloadZip}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <Download className="h-4 w-4 text-[#0071E3]" />
              Download .zip
            </button>

            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
                Delete history
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs dark:border-rose-900 dark:bg-rose-950/50">
                <span className="font-medium text-rose-800 dark:text-rose-200">
                  Delete all saved conversions?
                </span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="rounded-lg bg-rose-600 px-2.5 py-1 font-semibold text-white hover:bg-rose-500"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg px-2 py-1 text-slate-600 hover:underline dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Create Key Modal */}
      {createKeyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {generatedKey ? 'Save your new MCP API key' : 'Create MCP API Key'}
              </h3>
              <button
                type="button"
                onClick={() => setCreateKeyOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {generatedKey ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Copy this key now. For your security, the full token is only shown once.
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-slate-900 dark:text-slate-100">
                    {generatedKey}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(generatedKey);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 1800);
                      } catch {
                        // Ignore clipboard failure
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#0071E3] px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateKeyOpen(false)}
                  className="w-full rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white dark:bg-slate-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateApiKey} className="mt-4 space-y-4">
                <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Key label</span>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Cursor on MacBook"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateKeyOpen(false)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#0071E3] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0077ED]"
                  >
                    Generate Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
