export interface GroqRateLimitSnapshot {
  limitRequestsPerMinute: number | null;
  remainingRequestsPerMinute: number | null;
  limitTokensPerMinute: number | null;
  remainingTokensPerMinute: number | null;
  limitRequestsPerDay: number | null;
  remainingRequestsPerDay: number | null;
  capturedAt: number | null;
}

const snapshot: GroqRateLimitSnapshot = {
  limitRequestsPerMinute: null,
  remainingRequestsPerMinute: null,
  limitTokensPerMinute: null,
  remainingTokensPerMinute: null,
  limitRequestsPerDay: null,
  remainingRequestsPerDay: null,
  capturedAt: null,
};

export function updateFromHeaders(headers: Record<string, string | string[] | undefined>) {
  const h = (key: string) => {
    const v = headers[key];
    if (!v) return null;
    const n = parseInt(Array.isArray(v) ? v[0] : v, 10);
    return isNaN(n) ? null : n;
  };

  const limitReqMin = h('x-ratelimit-limit-requests');
  const remainReqMin = h('x-ratelimit-remaining-requests');
  const limitTokMin = h('x-ratelimit-limit-tokens');
  const remainTokMin = h('x-ratelimit-remaining-tokens');
  const limitReqDay = h('x-ratelimit-limit-requests-day');
  const remainReqDay = h('x-ratelimit-remaining-requests-day');

  if (limitReqMin !== null) snapshot.limitRequestsPerMinute = limitReqMin;
  if (remainReqMin !== null) snapshot.remainingRequestsPerMinute = remainReqMin;
  if (limitTokMin !== null) snapshot.limitTokensPerMinute = limitTokMin;
  if (remainTokMin !== null) snapshot.remainingTokensPerMinute = remainTokMin;
  if (limitReqDay !== null) snapshot.limitRequestsPerDay = limitReqDay;
  if (remainReqDay !== null) snapshot.remainingRequestsPerDay = remainReqDay;
  snapshot.capturedAt = Date.now();
}

export function getSnapshot(): GroqRateLimitSnapshot {
  return { ...snapshot };
}
