/** Vercel serverless request-body limit (platform rejects anything larger before the function runs). */
export const VERCEL_BODY_LIMIT_BYTES = 4_500_000;

export const UPLOAD_TOO_LARGE_MESSAGE =
  'This upload is too large. Vercel accepts request bodies up to 4.5 MB. Use a smaller image or PDF and try again.';

/** Raw file size that still fits after base64 and JSON wrapping. */
export const MAX_UPLOAD_FILE_BYTES = 3_000_000;

export function contentLengthTooLarge(request: Request): boolean {
  const raw = request.headers.get('content-length');
  if (!raw) return false;
  const size = Number(raw);
  return Number.isFinite(size) && size > VERCEL_BODY_LIMIT_BYTES;
}
