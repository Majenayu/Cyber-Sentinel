export interface ProviderSnapshot {
  limitRequestsPerMinute: number | null;
  remainingRequestsPerMinute: number | null;
  limitTokensPerMinute: number | null;
  remainingTokensPerMinute: number | null;
  limitRequestsPerDay: number | null;
  remainingRequestsPerDay: number | null;
  limitTokensPerDay: number | null;
  remainingTokensPerDay: number | null;
  capturedAt: number | null;
  /** Total calls made to this provider since server start */
  callsTotal: number;
  /** Timestamp of the last successful call */
  lastCalledAt: number | null;
  /** Last error message, if the most recent call failed */
  lastError: string | null;
}

export interface ProviderInfo {
  key: string;
  label: string;
  configured: boolean;
  staticLimits: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
    requestsPerDay?: number;
    tokensPerDay?: number;
    note?: string;
  };
  snapshot: ProviderSnapshot;
}

const EMPTY_SNAPSHOT = (): ProviderSnapshot => ({
  limitRequestsPerMinute: null,
  remainingRequestsPerMinute: null,
  limitTokensPerMinute: null,
  remainingTokensPerMinute: null,
  limitRequestsPerDay: null,
  remainingRequestsPerDay: null,
  limitTokensPerDay: null,
  remainingTokensPerDay: null,
  capturedAt: null,
  callsTotal: 0,
  lastCalledAt: null,
  lastError: null,
});

const snapshots: Record<string, ProviderSnapshot> = {};

function getSnap(provider: string): ProviderSnapshot {
  if (!snapshots[provider]) snapshots[provider] = EMPTY_SNAPSHOT();
  return snapshots[provider];
}

function h(headers: Record<string, string | string[] | undefined>, key: string): number | null {
  const v = headers[key];
  if (!v) return null;
  const n = parseInt(Array.isArray(v) ? v[0] : v, 10);
  return isNaN(n) ? null : n;
}

/** Call this BEFORE each provider request to increment the counter */
export function recordProviderCall(provider: string) {
  const snap = getSnap(provider);
  snap.callsTotal += 1;
  snap.lastCalledAt = Date.now();
  snap.lastError = null;
}

/** Call this when a provider request fails */
export function recordProviderError(provider: string, error: string) {
  const snap = getSnap(provider);
  snap.lastError = error;
}

export function updateProviderHeaders(
  provider: string,
  headers: Record<string, string | string[] | undefined>
) {
  const snap = getSnap(provider);
  const pick = (field: keyof ProviderSnapshot, key: string) => {
    const val = h(headers, key);
    if (val !== null) (snap as any)[field] = val;
  };

  pick('limitRequestsPerMinute', 'x-ratelimit-limit-requests');
  pick('remainingRequestsPerMinute', 'x-ratelimit-remaining-requests');
  pick('limitTokensPerMinute', 'x-ratelimit-limit-tokens');
  pick('remainingTokensPerMinute', 'x-ratelimit-remaining-tokens');
  pick('limitRequestsPerDay', 'x-ratelimit-limit-requests-day');
  pick('remainingRequestsPerDay', 'x-ratelimit-remaining-requests-day');
  pick('limitTokensPerDay', 'x-ratelimit-limit-tokens-day');
  pick('remainingTokensPerDay', 'x-ratelimit-remaining-tokens-day');

  // OpenRouter / per-minute suffix variants
  pick('limitRequestsPerMinute', 'x-ratelimit-limit-requests-per-minute');
  pick('remainingRequestsPerMinute', 'x-ratelimit-remaining-requests-per-minute');
  pick('limitTokensPerMinute', 'x-ratelimit-limit-tokens-per-minute');
  pick('remainingTokensPerMinute', 'x-ratelimit-remaining-tokens-per-minute');

  // Mistral-specific header names (captured from live responses June 2026)
  // Mistral uses -req-minute and -tokens-minute suffixes, not the standard -requests/-tokens names
  pick('limitRequestsPerMinute', 'x-ratelimit-limit-req-minute');
  pick('remainingRequestsPerMinute', 'x-ratelimit-remaining-req-minute');
  pick('limitTokensPerMinute', 'x-ratelimit-limit-tokens-minute');
  pick('remainingTokensPerMinute', 'x-ratelimit-remaining-tokens-minute');

  // Cohere variants
  pick('limitRequestsPerMinute', 'x-api-warning');
  pick('remainingRequestsPerMinute', 'x-ratelimit-remaining');

  snap.capturedAt = Date.now();
}

export function getProviderSnapshot(provider: string): ProviderSnapshot {
  return { ...getSnap(provider) };
}

export const KNOWN_LIMITS: Record<string, ProviderInfo['staticLimits']> = {
  groq: {
    requestsPerMinute: 1000,
    tokensPerMinute: 12000,
    requestsPerDay: 6000,
    note: 'Free tier · llama-3.3-70b-versatile',
  },
  mistral: {
    requestsPerMinute: 60,
    tokensPerMonth: 500_000,
    note: 'Free tier · mistral-small-latest',
  } as any,
};
