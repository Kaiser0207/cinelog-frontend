import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import CardDeck from './CardDeck';
import SpineShelf from './SpineShelf';
import CompactGrid from './CompactGrid';
import MobileReviewList from './MobileReviewList';
import { API_URL, flattenReview } from '../utils/constants';
import { cachedJson } from '../utils/apiCache';
import { useLanguage } from './LanguageContext';

// The backend caps a page at 100. Both views want the WHOLE collection — a shelf
// holding 12 of your 100 films isn't a shelf — so we just page through it.
const PAGE = 100;

function feedUrl({ searchQuery, searchMode, sort, genre, media, offset }) {
  const p = new URLSearchParams();
  if (searchQuery) {
    p.set('q', searchQuery);
    p.set('mode', searchMode);
    p.set('limit', '50');
    return `${API_URL}/api/reviews/search?${p}`;
  }
  p.set('offset', String(offset));
  p.set('limit', String(PAGE));
  p.set('sort', sort);
  p.set('view', 'summary');
  if (genre) p.set('genre', genre);
  if (media) p.set('media', media);
  return `${API_URL}/api/reviews?${p}`;
}

export default function ReviewFeed({ sort = 'newest', genre = '', media = '', searchQuery = '', searchMode = 'standard', viewMode = 'shelf' }) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [failed, setFailed] = useState(false);

  // The featured picks are pinned by the admin on the review page. Fetched on their
  // own so they aren't tied to pagination or the current sort — a deliberate
  // editorial choice, not "whatever's most recent".
  const [featuredReviews, setFeaturedReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;
    cachedJson(`${API_URL}/api/reviews/featured`)
      .then((data) => {
        if (!cancelled) setFeaturedReviews(Array.isArray(data) ? data.map(flattenReview) : []);
      })
      .catch((err) => console.error('Failed to fetch featured reviews:', err));
    return () => { cancelled = true; };
  }, []);

  // ONE effect owns the whole feed, and it re-runs from scratch whenever the query
  // changes. What was here before had two bugs that fed each other:
  //
  //   1. fetchReviews was a useCallback over [sort, genre, media, loading] but its
  //      body READ searchQuery and searchMode. So the memoised function kept whatever
  //      query was current the last time `loading` flipped — which is the render at the
  //      END of the previous fetch. Type a query and the effect fired the STALE
  //      closure: it took the `else` branch and fetched the unfiltered feed. Every
  //      search after that was one query behind, and clearing the box searched for the
  //      query you'd just deleted.
  //
  //   2. `if (loading) return` at the top. The reset effect called fetchReviews the
  //      moment you tapped a genre — and if a request was already in flight (very
  //      reachable: Render's free tier cold-starts for 30s, and we auto-paginate) the
  //      call was silently DROPPED. Nothing re-queued it. The old request then landed
  //      with reset=true and painted the OLD genre's films under the NEW genre's pill,
  //      and the auto-paginator would happily append the new genre's page 2 onto it.
  //
  // A generation counter fixes both: the newest request always wins, an older one that
  // lands late is thrown away, and nothing is ever refused.
  const gen = useRef(0);

  useEffect(() => {
    const mine = ++gen.current;
    const ac = new AbortController();

    setReviews([]);
    setInitialLoad(true);
    setLoading(true);
    setFailed(false);

    (async () => {
      const all = [];
      let offset = 0;

      // Both views want the whole collection and neither renders an infinite-scroll
      // sentinel, so just walk the pages here rather than bouncing through state.
      for (;;) {
        let page;
        try {
          const data = await cachedJson(
            feedUrl({ searchQuery, searchMode, sort, genre, media, offset }),
            { signal: ac.signal }
          );
          page = (searchQuery ? data.results : (data.reviews || data)) || [];
        } catch (err) {
          if (ac.signal.aborted || mine !== gen.current) return;
          console.error('Failed to fetch reviews:', err);
          setFailed(true);
          setLoading(false);
          setInitialLoad(false);
          return;
        }
        if (mine !== gen.current) return;   // a newer query has overtaken us

        all.push(...page.map(flattenReview));
        setReviews([...all]);
        setInitialLoad(false);

        if (searchQuery || page.length < PAGE) break;
        offset += PAGE;
      }

      if (mine !== gen.current) return;
      setLoading(false);
    })();

    return () => { ac.abort(); };
  }, [sort, genre, media, searchQuery, searchMode]);

  // Memoised so the views get STABLE arrays. Rebuilding them each render would
  // re-render every card (defeating their memo) and re-run the poster preload,
  // mid-scroll, for nothing.
  const featuredIds = useMemo(
    () => new Set(featuredReviews.map((r) => r.id)),
    [featuredReviews]
  );
  // 精選 REORDERS the current results; it doesn't inject into them. Splicing the
  // pinned reviews in from their own endpoint meant a featured comedy kept showing
  // up at the head of the 恐怖 shelf — it had never passed through the genre filter
  // at all. Now a pinned review only leads if it's actually part of what you asked
  // for. A search just shows its results, unshuffled.
  const items = useMemo(() => {
    if (searchQuery) return reviews;
    const pinned = reviews.filter((r) => featuredIds.has(r.id));
    const rest = reviews.filter((r) => !featuredIds.has(r.id));
    return [...pinned, ...rest];
  }, [searchQuery, reviews, featuredIds]);

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center" style={{ height: '70svh' }} role="status" aria-label={t('loadingReviews')}>
        <div
          className="aspect-[2/3] rounded-2xl bg-[#1A1A1A]/10 animate-pulse"
          style={{ height: 'clamp(340px, 62svh, 580px)' }}
        />
      </div>
    );
  }

  // A dead backend is not an empty collection. This used to fall through to "No
  // Reviews Yet — start your cinematic journal", which told a visitor the shelf was
  // empty when in fact the API had 500'd (or, on Render's free tier, simply hadn't
  // finished waking up). Say what actually happened, and let them retry.
  if (failed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center"
        role="alert"
      >
        <span className="text-6xl mb-4">📡</span>
        <h3 className="text-xl font-bold font-syne tracking-tighter text-[#1A1A1A] mb-2">
          {t('feedErrorTitle')}
        </h3>
        <p className="text-text-muted text-sm max-w-sm mb-5">
          {t('feedErrorDesc')}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-sm font-bold"
        >
          {t('retry')}
        </button>
      </motion.div>
    );
  }

  if (reviews.length === 0 && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center"
        role="status"
      >
        <span className="text-6xl mb-4">🎬</span>
        <h3 className="text-xl font-bold font-syne tracking-tighter text-[#1A1A1A] mb-2">
          {t('noReviewsTitle')}
        </h3>
        <p className="text-text-muted text-sm max-w-sm">
          {t('noReviewsDesc')}
        </p>
      </motion.div>
    );
  }

  if (viewMode === 'search-list') {
    return (
      <section aria-label={`${t('reviewResults')}: ${items.length}`}>
        <MobileReviewList reviews={items} featuredIds={featuredIds} />
      </section>
    );
  }

  if (viewMode === 'compact' || searchQuery) {
    return (
      <section aria-label={`${t('reviewResults')}: ${items.length}`}>
        <CompactGrid reviews={items} featuredIds={featuredIds} />
      </section>
    );
  }
  // 疊卡 — flip through them one at a time.
  if (viewMode === 'deck') {
    return (
      <section aria-label={`${t('reviewResults')}: ${items.length}`}>
        <CardDeck reviews={items} featuredIds={featuredIds} />
      </section>
    );
  }
  // 書脊牆 — the default: the whole collection, on a shelf.
  return (
    <section aria-label={`${t('reviewResults')}: ${items.length}`}>
      <SpineShelf reviews={items} featuredIds={featuredIds} />
    </section>
  );
}
