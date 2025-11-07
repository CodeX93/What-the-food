// Free scan limit management for non-authenticated users
const FREE_SCAN_LIMIT_KEY = "wtf_free_scans_remaining";
const FREE_SCAN_LIMIT = 5;

/**
 * Get the remaining free scans for the current user
 */
export function getRemainingFreeScans(): number {
  try {
    const stored = localStorage.getItem(FREE_SCAN_LIMIT_KEY);
    if (stored === null) {
      // First time user - initialize with full limit
      localStorage.setItem(FREE_SCAN_LIMIT_KEY, FREE_SCAN_LIMIT.toString());
      return FREE_SCAN_LIMIT;
    }
    const count = parseInt(stored, 10);
    return isNaN(count) ? FREE_SCAN_LIMIT : count;
  } catch (error) {
    console.error("Error reading free scan count:", error);
    return FREE_SCAN_LIMIT;
  }
}

/**
 * Decrement the free scan count
 * Returns the new count, or throws if no scans remaining
 */
export function decrementFreeScan(): number {
  const remaining = getRemainingFreeScans();
  if (remaining <= 0) {
    throw new Error("No free scans remaining");
  }
  const newCount = remaining - 1;
  try {
    localStorage.setItem(FREE_SCAN_LIMIT_KEY, newCount.toString());
  } catch (error) {
    console.error("Error saving free scan count:", error);
  }
  return newCount;
}

/**
 * Check if user has free scans available
 */
export function hasFreeScanAvailable(): boolean {
  return getRemainingFreeScans() > 0;
}

/**
 * Reset free scans (used when user logs in or upgrades)
 */
export function resetFreeScans(): void {
  try {
    localStorage.removeItem(FREE_SCAN_LIMIT_KEY);
  } catch (error) {
    console.error("Error resetting free scan count:", error);
  }
}

/**
 * Check if user is authenticated and has premium access
 * Returns true if user should bypass free scan limits
 */
export function shouldBypassFreeScanLimit(user: any, isPremium: boolean): boolean {
  // Authenticated users with premium get unlimited scans
  if (user && isPremium) {
    return true;
  }
  // Free authenticated users still have limits (handled elsewhere)
  return false;
}

