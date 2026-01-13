type FreeScanType = "unregistered" | "registered";

export type FreeScanStatus = {
  type: FreeScanType;
  remaining: number;
};

const API_ENDPOINT = "/api/free-scans";
const REQUEST_TIMEOUT_MS = 8000; // prevent UI from hanging indefinitely

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestStatus(): Promise<FreeScanStatus> {
  // Always fetch from database via API (no caching)
  const response = await fetchWithTimeout(API_ENDPOINT, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Unable to fetch free scan status");
  }

  const data = (await response.json()) as FreeScanStatus;
  return data;
}

export async function getFreeScanStatus(): Promise<FreeScanStatus> {
  return requestStatus();
}

export async function getRemainingFreeScans(): Promise<number> {
  try {
    const status = await requestStatus();
    // -1 indicates unlimited scans (premium users)
    return status.remaining;
  } catch (error) {
    // AbortError is expected during Fast Refresh in development - don't log it
    if (error instanceof Error && error.name === 'AbortError') {
      // Silently return fallback value
      return 3;
    }
    console.error("getRemainingFreeScans error", error);
    // Prefer optimistic UX (server still enforces limits)
    return 3;
  }
}

/**
 * Check if user has unlimited scans (premium users)
 */
export function isUnlimitedScans(remaining: number): boolean {
  return remaining === -1;
}

export async function hasFreeScanAvailable(): Promise<boolean> {
  const remaining = await getRemainingFreeScans();
  // -1 indicates unlimited scans (premium users)
  return remaining === -1 || remaining > 0;
}

export async function decrementFreeScan(): Promise<number> {
  const response = await fetchWithTimeout(API_ENDPOINT, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "No free scans remaining");
  }

  const data = (await response.json()) as FreeScanStatus;
  return data.remaining;
}

export async function resetFreeScans(): Promise<number> {
  const response = await fetchWithTimeout(API_ENDPOINT, {
    method: "PATCH",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to reset free scans");
  }

  const data = (await response.json()) as FreeScanStatus;
  return data.remaining;
}

export function shouldBypassFreeScanLimit(user: any, isPremium: boolean): boolean {
  return Boolean(user && isPremium);
}


