export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  if (process.env.PUBLIK_SELF_TEST) {
    const { ensureSignedIn } = await import('@/lib/publik-sdk');
    await ensureSignedIn();
    return;
  }

  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    const { readCredential, startTelemetry } = await import('@/lib/publik-sdk');
    const cred = readCredential();
    if (cred || process.env.PUBLIK_API_KEY) {
      startTelemetry();
    }
  }
}
