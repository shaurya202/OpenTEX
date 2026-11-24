import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { executePublikAction, type PublikActionPayload } from '@/lib/publik';
import {
  MODELS,
  credentialFromCookieJson,
  resolveProvider,
  topUpUrlFrom402,
  withRequestCredential,
} from '@/lib/publik-sdk';
import {
  UPLOAD_TOO_LARGE_MESSAGE,
  VERCEL_BODY_LIMIT_BYTES,
  contentLengthTooLarge,
} from '@/lib/upload-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CRED_COOKIE = 'publik_cred';

export async function POST(request: Request) {
  if (contentLengthTooLarge(request)) {
    return NextResponse.json({ error: UPLOAD_TOO_LARGE_MESSAGE }, { status: 413 });
  }

  let raw = '';
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: UPLOAD_TOO_LARGE_MESSAGE }, { status: 413 });
  }
  if (raw.length > VERCEL_BODY_LIMIT_BYTES) {
    return NextResponse.json({ error: UPLOAD_TOO_LARGE_MESSAGE }, { status: 413 });
  }

  try {
    const initial = credentialFromCookieJson((await cookies()).get(CRED_COOKIE)?.value);
    return await withRequestCredential(initial, async () => {
      let body: Partial<PublikActionPayload> | null;
      try {
        body = JSON.parse(raw) as Partial<PublikActionPayload>;
      } catch {
        return NextResponse.json(
          { error: 'Invalid request body: expected JSON.' },
          { status: 400 }
        );
      }
      if (!body || typeof body.action !== 'string') {
        return NextResponse.json(
          { error: 'Invalid request body: missing "action" field.' },
          { status: 400 }
        );
      }

      const suppliedKey = body.config?.apiKey?.trim();
      const userKey = suppliedKey
        ? {
            baseURL: (body.config?.baseUrl || 'https://publikhq.com/api/v1').trim(),
            apiKey: suppliedKey,
          }
        : null;

      const provider = resolveProvider(userKey);

      let effectivePayload = body as PublikActionPayload;
      if (provider.kind === 'publik' || provider.kind === 'own') {
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
      }

      const output = await executePublikAction(effectivePayload);
      if (output.statusCode === 402) {
        const { message, url } = topUpUrlFrom402({
          error: { message: output.message, top_up_url: output.topUpUrl ?? undefined },
        });
        return NextResponse.json({ error: message, topUpUrl: url }, { status: 402 });
      }

      return NextResponse.json(output);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to execute Publik action.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
