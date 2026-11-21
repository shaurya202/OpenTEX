import { NextResponse } from 'next/server';
import {
  APP_SLUG,
  APP_VERSION,
  appToken,
  DEFAULT_BASE_URL,
  gateScreen,
  provision,
  readCredential,
  readWallet,
  setChoice,
  startTelemetry,
  USES_AI,
  writeCredential,
  type Choice,
  type PublikCredential,
  type Wallet,
} from '@/lib/publik-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeWalletSummary(w: Wallet | null) {
  if (!w) return null;
  const wWithUse = w as Wallet & { used_percent?: number | null };
  return {
    claim_state: w.claim_state,
    handle: w.account?.handle ?? null,
    plan: w.plan,
    used_percent: wWithUse.used_percent ?? null,
    remaining_percent: w.remaining_percent ?? null,
    prepaid_remaining_percent: w.prepaid_remaining_percent ?? null,
    top_up_url: w.top_up_url,
  };
}

async function computeStatus() {
  const token = appToken();
  const hasAppToken = token.startsWith('pat_');
  const hasEnvKey = Boolean(process.env.PUBLIK_API_KEY?.trim());
  let cred: PublikCredential | null = readCredential();
  let walletResult: Awaited<ReturnType<typeof readWallet>>;

  try {
    if (hasEnvKey) {
      cred = {
        key: process.env.PUBLIK_API_KEY!.trim(),
        base_url: DEFAULT_BASE_URL,
        install_id: '',
        claim_url: null,
      };
    } else if (!cred) {
      cred = await provision();
    }

    walletResult = await readWallet(cred.key);
    if (walletResult.status === 401 && !hasEnvKey) {
      writeCredential(null);
      cred = await provision();
      walletResult = await readWallet(cred.key);
    }
  } catch (err) {
    const offline = err instanceof TypeError || (err instanceof Error && /abort|timeout/i.test(err.name));
    return {
      slug: APP_SLUG,
      version: APP_VERSION,
      usesAi: USES_AI,
      hasAppToken,
      choice: cred?.choice ?? null,
      wallet: null,
      gate: {
        state: 'unreachable' as const,
        hasAppToken,
        screen: gateScreen(
          'unreachable',
          null,
          null,
          offline ? undefined : err instanceof Error ? err.message : String(err)
        ),
      },
    };
  }

  const wallet = walletResult.wallet;
  if (!wallet) {
    return {
      slug: APP_SLUG,
      version: APP_VERSION,
      usesAi: USES_AI,
      hasAppToken,
      choice: cred?.choice ?? null,
      wallet: null,
      gate: {
        state: 'unreachable' as const,
        hasAppToken,
        screen: gateScreen('unreachable', null, null, walletResult.message ?? undefined),
      },
    };
  }

  if (wallet.claim_state !== 'claimed') {
    if (!wallet.claim_url && !cred?.claim_url && hasAppToken && !hasEnvKey) {
      try {
        cred = await provision();
      } catch {
        // Keep existing wallet/cred if re-provision fails
      }
    }
    const claimUrl =
      wallet.claim_url ??
      cred?.claim_url ??
      `${DEFAULT_BASE_URL.replace(/\/api\/v1$/, '')}/wallet`;

    return {
      slug: APP_SLUG,
      version: APP_VERSION,
      usesAi: USES_AI,
      hasAppToken,
      choice: cred?.choice ?? null,
      wallet: sanitizeWalletSummary(wallet),
      gate: {
        state: 'sign_in' as const,
        hasAppToken,
        claimUrl,
        screen: gateScreen('sign_in', wallet),
      },
    };
  }

  let choice: Choice | null = USES_AI ? (readCredential()?.choice ?? null) : null;
  if (USES_AI && !choice) {
    choice = 'publik';
    if (!hasEnvKey) setChoice(choice);
  }
  startTelemetry();

  return {
    slug: APP_SLUG,
    version: APP_VERSION,
    usesAi: USES_AI,
    hasAppToken,
    choice,
    wallet: sanitizeWalletSummary(wallet),
    gate: {
      state: 'ready' as const,
      hasAppToken,
      choice,
      topUpUrl: wallet.top_up_url,
    },
  };
}

export async function GET() {
  try {
    const status = await computeStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to check publik status.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      choice?: Choice | null;
    };

    if (body.action === 'set_choice') {
      const nextChoice: Choice | null =
        body.choice === 'publik' || body.choice === 'own_key' ? body.choice : null;
      setChoice(nextChoice);
      const status = await computeStatus();
      return NextResponse.json({ success: true, ...status });
    }

    if (body.action === 'show_choose') {
      const cred = readCredential();
      const key = process.env.PUBLIK_API_KEY?.trim() || cred?.key || '';
      const wallet = key ? (await readWallet(key).catch(() => ({ wallet: null }))).wallet : null;
      return NextResponse.json({
        gate: {
          state: 'choose' as const,
          topUpUrl: wallet?.top_up_url ?? `${DEFAULT_BASE_URL.replace(/\/api\/v1$/, '')}/wallet`,
          screen: gateScreen('choose', wallet),
        },
      });
    }

    const status = await computeStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update publik status.' },
      { status: 500 }
    );
  }
}
