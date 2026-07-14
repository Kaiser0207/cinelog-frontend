import { useEffect, useState } from 'react';
import { API_URL } from './constants';

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

async function loadCatalog() {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${API_URL}/api/reviews?limit=${PAGE}&offset=${offset}&sort=newest`);
    if (!res.ok) break;
    const data = await res.json();
    const page = data.reviews || [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  // Acquisition order. №1 is the first review you ever wrote — and stays №1 forever,
  // whatever you add. (created_at is a Postgres TIMESTAMPTZ string, and they're all
  // UTC with the same shape, so a lexicographic compare IS a chronological one — no
  // Date parsing, which Safari would only refuse to do anyway.)
  rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

  const byId = new Map();
  rows.forEach((r, i) => byId.set(r.id, i + 1));
  return byId;
}

/**
 * Map of review id → catalogue number, or null until it lands. Not cached across
 * mounts on purpose: delete a film and come back to the shelf, and the numbers behind
 * it have to have closed up. One request for the whole collection is cheap enough to
 * pay for that being true.
 */
export function useCatalogNumbers() {
  const [numbers, setNumbers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadCatalog()
      .then((m) => { if (!cancelled) setNumbers(m); })
      .catch((err) => console.error('Failed to build catalogue numbers:', err));
    return () => { cancelled = true; };
  }, []);

  return numbers;
}

/** № 07 — zero-padded to two digits, so a shelf of them lines up. */
export function formatCatalogNo(n) {
  return n == null ? null : String(n).padStart(2, '0');
}
