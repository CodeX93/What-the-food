type FreeScanType = "unregistered" | "registered";

export type FreeScanStatus = {
  type: FreeScanType;
  remaining: number;
};

// OPTIMIZATION: Memory cache for instant access
let cachedStatus: FreeScanStatus | null = null;

const API_ENDPOINT = "/api/free-scans";
const CACHE_KEY = "wtf_free_scans_cache";
const CACHE_DURATION = 60 * 1000; // 1 minute

// Get cached scan status from localStorage
function getCachedScanStatus(): FreeScanStatus | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    // Check if cache is still valid (less than 1 minute old)
    if (Date.now() - data.timestamp < CACHE_DURATION) {
      return data.status;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    // Ignore errors
  }
  return null;
}

// Save scan status to localStorage
function setCachedScanStatus(status: FreeScanStatus) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      status,
      timestamp: Date.now(),
    }));
  } catch (error) {
    // Ignore errors
  }
}

async function requestStatus(force = false): Promise<FreeScanStatus> {
  // OPTIMIZATION: Check localStorage cache first for instant loading
  if (!force) {
    // Try memory cache first (fastest)
    if (cachedStatus) {
    return cachedStatus;
    }
    
    // Try localStorage cache (still fast)
    const cached = getCachedScanStatus();
    if (cached) {
      cachedStatus = cached;
      return cached;
    }
  }

  const response = await fetch(API_ENDPOINT, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Unable to fetch free scan status");
  }

  const data = (await response.json()) as FreeScanStatus;
  
  // Cache in memory and localStorage
  cachedStatus = data;
  setCachedScanStatus(data);
  
  return data;
}

export async function getFreeScanStatus(force = false): Promise<FreeScanStatus> {
  return requestStatus(force);
}

export async function getRemainingFreeScans(force = false): Promise<number> {
  try {
    const status = await requestStatus(force);
    return status.remaining;
  } catch (error) {
    console.error("getRemainingFreeScans error", error);
    return 0;
  }
}

export async function hasFreeScanAvailable(): Promise<boolean> {
  const remaining = await getRemainingFreeScans();
  return remaining > 0;
}

export async function decrementFreeScan(): Promise<number> {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "No free scans remaining");
  }

  const data = (await response.json()) as FreeScanStatus;
  
  // Update both caches
  cachedStatus = data;
  setCachedScanStatus(data);
  
  return data.remaining;
}

export async function resetFreeScans(): Promise<number> {
  const response = await fetch(API_ENDPOINT, {
    method: "PATCH",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to reset free scans");
  }

  const data = (await response.json()) as FreeScanStatus;
  
  // Update both caches
  cachedStatus = data;
  setCachedScanStatus(data);
  
  return data.remaining;
}

export function invalidateFreeScanCache() {
  cachedStatus = null;
  
  // Also clear localStorage cache
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      // Ignore errors
    }
  }
}

export function shouldBypassFreeScanLimit(user: any, isPremium: boolean): boolean {
  return Boolean(user && isPremium);
}

// OPTIMIZATION: Get cached scan status synchronously for instant initialization
export function getCachedScanStatusSync(): FreeScanStatus | null {
  // Return memory cache if available
  if (cachedStatus) {
    return cachedStatus;
  }
  
  // Return localStorage cache if available
  return getCachedScanStatus();
}

