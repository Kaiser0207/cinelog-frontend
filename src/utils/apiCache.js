/**
 * A ~30-line request cache. Not a state library — just enough that the app stops
 * asking the backend the same question twice.
 *
 * It matters more here than it would elsewhere, because the API is on Render's free
 * tier: it spins down when idle, and the request that wakes it can take 30+ seconds.
 * Every duplicate is a coin-flip on paying that again.
 *
 * What was duplicated before this existed:
 *   - <AnimatePresence mode="wait"> in App.jsx destroys HomePage on navigation, so
 *     opening a review and pressing back re-fetched the ENTIRE collection, the
 *     featured list and the catalogue. Every time.
 *   - ReviewFeed pages the whole collection; utils/catalog.js pages the whole
 *     collection; StatsPage pages the whole collection — the last two with a
 *     byte-identical URL.
 *   - The reactions palette (a static config list) was re-fetched on every mount of
 *     every ReactionBar.
 *
 * Keyed on the full URL, so a different genre/sort/offset is a different entry. The
 * promise is cached, not the response, so two callers racing on a cold start share the
 * one request instead of starting two.
 */

const cache = new Map();

const TTL = 5 * 60 * 1000;   // long enough to cover a browse; short enough to self-heal

export function cachedJson(url, { ttl = TTL, signal } = {}) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttl) return withSignal(hit.promise, signal);

  const promise = fetch(url).then((res) => {
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
    return res.json();
  });

  // A failure must NEVER be cached, or one blip poisons the entry for its whole TTL.
  promise.catch(() => cache.delete(url));
  cache.set(url, { promise, at: Date.now() });

  return withSignal(promise, signal);
}

/**
 * The caller's AbortController can't abort the underlying fetch — it's shared, and
 * another caller may still want it. What it CAN do is stop caring: this rejects the
 * caller's copy of the promise the moment their signal fires, while the shared request
 * runs to completion and populates the cache for whoever comes next.
 */
function withSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

// Things that hold DERIVED state built from cached responses (the catalogue numbers)
// and therefore have to be rebuilt when the cache is dropped, not just re-read.
const listeners = new Set();

export function onInvalidate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Call after any WRITE — save, delete, feature. A cache is only correct if the writes
 * invalidate it, and this is the one place that has to be remembered. Deleting a review
 * in particular has to reach the catalogue: the numbers behind the deleted film all
 * shift down by one, and that map is derived, not fetched.
 */
export function invalidateApiCache() {
  cache.clear();
  listeners.forEach((fn) => fn());
}
