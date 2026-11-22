import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { executePublikAction, type PublikActionPayload } from '@/lib/publik';
import {
  MODELS,
  readCredential,
  resolveProvider,
  topUpUrlFrom402,
  writeCredential,
  type PublikCredential,
} from '@/lib/publik-sdk';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!readCredential()) {
      try {
        const raw = (await cookies()).get('publik_cred')?.value;
        if (raw) {
          const parsed = JSON.parse(raw) as PublikCredential;
          if (typeof parsed?.key === 'string' && parsed.key.startsWith('pk_')) {
            writeCredential(parsed);
          }
        }
      } catch {
        // Ignore malformed cookie
      }
    }

    const body = (await request.json()) as Partial<PublikActionPayload> | null;
    if (!body || typeof body.action !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request body: missing "action" field.' },
        { status: 400 }
      );
    }

    const userKey = body.config?.apiKey
      ? {
          baseURL: body.config.baseUrl || 'https://publikhq.com/api/v1',
          apiKey: body.config.apiKey,
        }
      : null;

    const provider = resolveProvider(userKey);

    let effectivePayload = body as PublikActionPayload;
    if (provider.kind === 'publik') {
      effectivePayload = {
        ...effectivePayload,
        config: {
          ...body.config,
          baseUrl: provider.baseURL,
          apiKey: provider.apiKey,
          professionalModel: body.config?.professionalModel || MODELS.smart,
          turboModel: body.config?.turboModel || MODELS.fast,
        },
      };
    } else if (provider.kind === 'own') {
      effectivePayload = {
        ...effectivePayload,
        config: {
          ...body.config,
          baseUrl: provider.baseURL,
          apiKey: provider.apiKey,
        },
      };
    }

    const output = await executePublikAction(effectivePayload);
    if (output.statusCode === 402) {
      const { message, url } = topUpUrlFrom402({
        error: { message: output.message, top_up_url: output.topUpUrl ?? undefined },
      });
      return NextResponse.json(
        { error: message, topUpUrl: url },
        { status: 402 }
      );
    }

    return NextResponse.json(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to execute Publik action.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
