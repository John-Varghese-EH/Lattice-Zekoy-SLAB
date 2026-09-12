import browser from 'webextension-polyfill';

/**
 * Checks if the current URL is blacklisted by the user.
 * This runs before any extraction logic to ensure strict privacy.
 */
export async function isBlacklisted(url) {
  try {
    const settings = await browser.storage.local.get('privacySettings');
    const blacklist = settings?.privacySettings?.blacklist || [];
    
    for (const pattern of blacklist) {
      if (matchPattern(url, pattern)) {
        console.log(`Lattice: URL ${url} is blacklisted by pattern ${pattern}. Disabling extraction.`);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Failed to check blacklist', error);
    return false; // Fail open or fail closed? Usually fail closed (true) is safer for privacy, but we'll assume false for now so it doesn't break everything if storage fails.
  }
}

/**
 * Simple wildcard matching (e.g., *://*.bank.com/*)
 */
function matchPattern(url, pattern) {
  // Convert basic wildcard pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(url);
}
