import { useEffect, useState } from 'react';
import { API_URL } from './constants';
import { cachedJson, onInvalidate } from './apiCache';
import { buildCatalogNumberMap } from './catalogData';

/**
 * 館藏編號 — the Criterion-style number on a case's spine.
 *
 * NOT the database id. The ids have holes in them (1, 2 and 22 are three films you
 * deleted) and they have to keep their holes: /review/:id is what every bookmark,
 * every shared story card and every 精選 pin points at, so renumbering the primary
 * key wouldn't break those links — it would silently aim them at a DIFFERENT film,
 * which is worse than breaking them.
 *
 * So the catalogue number is a DISPLAY number, derived from position: sort the whole
 * collection by when you added it, and the number is the index. Which gives you
 * exactly the behaviour you wanted, for free and with nothing at risk:
 *
 *   - write a review  → it appends as the next number; nothing already on the shelf moves
 *   - delete a review → everything after it closes up (遞補)
 *
 * It's deliberately its own fetch of the WHOLE collection rather than something
 * derived from the feed. The feed is filtered by genre and re-sorted at will, and a
 * film that's №7 on the full shelf can't become №1 the moment you tap 恐怖 — the
 * number belongs to the film, not to the view you're looking at it through.
 */

const PAGE = 100;

/**
 * The whole collection, unfiltered. Summary is the lightweight default used by
 * catalogue fallbacks; consumers such as statistics can explicitly request `full`
 * when they need watch dates, genres, or other detail-only fields. Each URL/view is
 * cached independently, so repeated navigation does not repeat its page walk.
 */
export async function loadAllReviews({ view = 'summary' } = {}) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    // NOT `if (!res.ok) break` — a partial load here is worse than no load. Page 1
    // succeeding and page 2 failing would leave us numbering the newest 100 from 1,
    // so the oldest of those becomes №1 and every spine on the shelf quietly shows the
    // wrong number. A confidently wrong catalogue is worse than none: throw.
    const data = await cachedJson(`${API_URL}/api/reviews?limit=${PAGE}&offset=${offset}&sort=newest&view=${view}`);
    const page = data.reviews || [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

async function loadCatalog() {
  try {
    // id + created_at/catalog_number only: no second homepage download of every
    // review body, cast list and episode score.
    const data = await cachedJson(`${API_URL}/api/reviews/catalog`);
    const map = buildCatalogNumberMap(data);
    if (map.size > 0) return map;
    throw new Error('Catalog endpoint returned no rows');
  } catch (err) {
    // Vercel and Render deploy independently, so keep compatibility while the
    // backend is rolling out or when an older local API is used.
    console.warn('Lightweight catalog unavailable; using legacy collection fallback.', err);
    return buildCatalogNumberMap(await loadAllReviews());
  }
}

// Kicked off at module load, NOT when the shelf mounts. The shelf only mounts once the
// feed's first page has landed, so hanging the catalogue off it put the two whole-
// collection reads in a strict waterfall — the numbers arrived a full round-trip late,
// against a backend that may have been asleep. They're independent; run them together.
let catalogPromise = loadCatalog();

// The catalogue is DERIVED from the collection, so clearing the response cache isn't
// enough — this map has to be rebuilt. Which is exactly the 遞補 behaviour: delete a
// film and every number after it shifts down.
onInvalidate(() => { catalogPromise = loadCatalog(); });

/** Map of review id → catalogue number, or null until it lands (or if it failed). */
export function useCatalogNumbers() {
  const [numbers, setNumbers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    catalogPromise
      .then((m) => { if (!cancelled) setNumbers(m); })
      .catch((err) => {
        console.error('Failed to build catalogue numbers:', err);
        // Retry on the next mount rather than leaving the shelf permanently numberless.
        catalogPromise = loadCatalog();
      });
    return () => { cancelled = true; };
  }, []);

  return numbers;
}

/** № 07 — zero-padded to two digits, so a shelf of them lines up. */
export function formatCatalogNo(n) {
  return n == null ? null : String(n).padStart(2, '0');
}
