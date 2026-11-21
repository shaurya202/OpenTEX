'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, X } from 'lucide-react';

type GateAction = 'sign_in' | 'retry' | 'get_plan' | 'connect' | 'own_key';

interface GateScreen {
  id: 'sign_in' | 'unreachable' | 'choose';
  title: string;
  body: string;
  note: string | null;
  buttons: { action: GateAction; label: string }[];
}

interface GatePayload {
  state: 'sign_in' | 'unreachable' | 'choose' | 'ready';
  hasAppToken?: boolean;
  claimUrl?: string;
  topUpUrl?: string;
  screen?: GateScreen;
}

interface StatusResponse {
  hasAppToken?: boolean;
  gate?: GatePayload;
}

interface Payment402Detail {
  message: string;
  topUpUrl: string | null;
}

const POLL_MS = 3_000;
const POLL_LIMIT_MS = 10 * 60_000;

export function PublikGate({
  children,
  initialHasAppToken = false,
}: {
  children: React.ReactNode;
  initialHasAppToken?: boolean;
}) {
  const [loading, setLoading] = useState(initialHasAppToken);
  const [gate, setGate] = useState<GatePayload | null>(null);
  const [hasAppToken, setHasAppToken] = useState<boolean>(initialHasAppToken);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal402, setModal402] = useState<Payment402Detail | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async (): Promise<GatePayload | null> => {
    try {
      const res = await fetch('/api/publik/status', { cache: 'no-store' });
      const data = (await res.json()) as StatusResponse;
      if (typeof data.hasAppToken === 'boolean') {
        setHasAppToken(data.hasAppToken);
      }
      if (data.gate) {
        setGate(data.gate);
        if (data.gate.state === 'ready') {
          stopPolling();
        }
        return data.gate;
      }
    } catch {
      setGate({
        state: 'unreachable',
        screen: {
          id: 'unreachable',
          title: 'Sign in with publik',
          body: 'publik is not reachable. Check your connection.',
          note: null,
          buttons: [{ action: 'retry', label: 'Retry' }],
        },
      });
    } finally {
      setLoading(false);
    }
    return null;
  }, [stopPolling]);

  useEffect(() => {
    void fetchStatus();

    const on402 = (e: Event) => {
      const detail = (e as CustomEvent<Payment402Detail>).detail;
      if (detail) setModal402(detail);
    };
    window.addEventListener('publik-402', on402);

    return () => {
      stopPolling();
      window.removeEventListener('publik-402', on402);
    };
  }, [fetchStatus, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    const deadline = Date.now() + POLL_LIMIT_MS;
    pollRef.current = setInterval(async () => {
      if (Date.now() >= deadline) {
        stopPolling();
        setNote('No sign-in after 10 minutes. Click Sign in with publik to try again.');
        return;
      }
      const next = await fetchStatus();
      if (next && next.state === 'ready') {
        setNote(null);
        stopPolling();
      }
    }, POLL_MS);
  }, [fetchStatus, stopPolling]);

  const handleAction = async (action: GateAction) => {
    if (action === 'retry') {
      setBusy(true);
      setNote(null);
      await fetchStatus();
      setBusy(false);
      return;
    }

    if (action === 'sign_in') {
      const targetUrl = gate?.claimUrl || 'https://publikhq.com/wallet';
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      setNote('Waiting for you to sign in in your browser.');
      startPolling();
      return;
    }

    if (action === 'get_plan') {
      const targetUrl = gate?.topUpUrl || 'https://publikhq.com/wallet';
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      setNote('Finish in your browser, then return here.');
      return;
    }

    if (action === 'connect' || action === 'own_key') {
      setBusy(true);
      try {
        const res = await fetch('/api/publik/status', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'set_choice',
            choice: action === 'connect' ? 'publik' : 'own_key',
          }),
        });
        const data = (await res.json()) as StatusResponse;
        if (data.gate) setGate(data.gate);
      } finally {
        setBusy(false);
      }
    }
  };

  const unlocked = gate?.state === 'ready' || (!loading && !hasAppToken);

  if (unlocked) {
    return (
      <>
        {children}
        {modal402 && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-md rounded-xl border border-[#D2D2D7] bg-white p-6 shadow-xl dark:border-[#2C2C2E] dark:bg-[#1C1C1E]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {modal402.message}
                </p>
                <button
                  type="button"
                  onClick={() => setModal402(null)}
                  className="shrink-0 rounded-lg p-1.5 text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] dark:hover:bg-[#2C2C2E] dark:hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {modal402.topUpUrl && (
                <div className="mt-5">
                  <a
                    href={modal402.topUpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0071E3] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077ED]"
                  >
                    <span>{modal402.topUpUrl}</span>
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  const screen = gate?.screen;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] px-4 text-[#1D1D1F] dark:bg-[#161618] dark:text-[#F5F5F7]">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-[#D2D2D7] bg-white p-6 shadow-sm dark:border-[#2C2C2E] dark:bg-[#1C1C1E]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1D1D1F] font-serif text-lg font-semibold text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F]">
            &part;
          </div>
          <div>
            <p className="text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6]">OpenTEX</p>
            <h1 className="text-lg font-semibold tracking-tight">
              {screen?.title ?? 'Sign in with publik'}
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2.5 py-2 text-sm text-[#6E6E73] dark:text-[#A1A1A6]">
            <Loader2 className="h-4 w-4 animate-spin text-[#0071E3]" />
            <span>Checking your publik session...</span>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-[#6E6E73] dark:text-[#A1A1A6]">
              {screen?.body ??
                'This app uses your publik account. Click Sign in with publik, then sign in in your browser. This window continues when you are signed in.'}
            </p>

            {(note || screen?.note) && (
              <p className="rounded-lg border border-[#0071E3]/25 bg-[#0071E3]/5 px-3.5 py-2.5 text-xs text-[#0071E3]">
                {note ?? screen?.note}
              </p>
            )}

            <div className="flex flex-col gap-2.5 pt-1">
              {(screen?.buttons ?? [{ action: 'sign_in' as GateAction, label: 'Sign in with publik' }]).map(
                (btn, idx) => {
                  const isPrimary = idx === 0;
                  return (
                    <button
                      key={btn.action}
                      type="button"
                      disabled={busy}
                      onClick={() => void handleAction(btn.action)}
                      className={
                        isPrimary
                          ? 'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0071E3] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50'
                          : 'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#D2D2D7] bg-white px-4 py-2.5 text-sm font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] disabled:opacity-50 dark:border-[#3A3A3C] dark:bg-[#2C2C2E] dark:text-[#F5F5F7]'
                      }
                    >
                      <span>{btn.label}</span>
                      {(btn.action === 'sign_in' || btn.action === 'get_plan') && (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      {btn.action === 'retry' && <RefreshCw className="h-4 w-4" />}
                    </button>
                  );
                }
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
