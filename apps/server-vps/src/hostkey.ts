import crypto from 'node:crypto';

export function makeHostKey(secret: string, meetingId: string): string {
  return crypto.createHmac('sha256', secret).update(meetingId).digest('hex');
}

export function verifyHostKey(secret: string, meetingId: string, candidate?: string): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const expected = makeHostKey(secret, meetingId);
  if (candidate.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
  } catch {
    return false;
  }
}
