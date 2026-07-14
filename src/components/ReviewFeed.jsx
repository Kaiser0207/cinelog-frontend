import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import CardDeck from './CardDeck';
import SpineShelf from './SpineShelf';
import { API_URL, flattenReview } from '../utils/constants';

// The backend caps a page at 100. Both views want the WHOLE collection — a shelf
// holding 12 of your 100 films isn't a shelf — so we just page through it.
const PAGE = 100;

export default function ReviewFeed({ sort = 'newest', genre = '', media = '', searchQuery = '', searchMode = 'standard', viewMode = 'shelf', onReviewsLoaded }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // The featured picks are pinned by the admin on the review page. Fetched on their
  // own so they aren't tied to pagination or the current sort — a deliberate
  // editorial choice, not "whatever's most recent".
  const [featuredReviews, setFeaturedReviews] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/reviews/featured`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFeaturedReviews(Array.isArray(data) ? data.map(flattenReview) : []))
      .catch((err) => console.error('Failed to fetch featured reviews:', err));
  }, []);

  const fetchReviews = useCallback(async (offset = 0, reset = false) => {
    if (loading) return;
    setLoading(true);

    try {
      let url = `${API_URL}/api/reviews`;
      const params = new URLSearchParams();

      if (searchQuery) {
        url = `${API_URL}/api/reviews/search`;
        params.append('q', searchQuery);
        params.append('mode', searchMode);
        params.append('limit', '50');
      } else {
        params.append('offset', offset.toString());
        params.append('limit', PAGE.toString());
        params.append('sort', sort);
        if (genre) params.append('genre', genre);
        if (media) params.append('media', media);
      }

      const res = await fetch(`${url}?${params}`);
      if (res.ok) {
        const data = await res.json();
        const rawItems = searchQuery ? (data.results || []) : (data.reviews || data || []);
        const items = rawItems.map(flattenReview);

        if (reset) {
          setReviews(items);
          if (onReviewsLoaded) onReviewsLoaded(items);
        } else {
          setReviews((prev) => {
            const next = [...prev, ...items];
            if (onReviewsLoaded) onReviewsLoaded(next);
            return next;
          });
        }

        setHasMore(searchQuery ? false : items.length >= PAGE);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [sort, genre, media, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setReviews([]);
    setHasMore(true);
    setInitialLoad(true);
    fetchReviews(0, true);
  }, [sort, genre, media, searchQuery, searchMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Neither view renders a sentinel to trip infinite scroll (they replace the whole
  // feed layout), so pull the next page the moment the last one lands. Each fetch
  // flips `loading`, which re-runs this.
  useEffect(() => {
    if (searchQuery || initialLoad || loading || !hasMore) return;
    fetchReviews(reviews.length);
  }, [searchQuery, initialLoad, loading, hasMore, reviews.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoised so the views get STABLE arrays. Rebuilding them each render would
  // re-render every card (defeating their memo) and re-run the poster preload,
  // mid-scroll, for nothing.
  const featuredIds = useMemo(
    () => new Set(featuredReviews.map((r) => r.id)),
    [featuredReviews]
  );
  // 精選: the pinned reviews lead, badged, then everything else. A search just shows
  // its results.
  const items = useMemo(
    () => (searchQuery
      ? reviews
      : [...featuredReviews, ...reviews.filter((r) => !featuredIds.has(r.id))]),
    [searchQuery, reviews, featuredReviews, featuredIds]
  );

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center" style={{ height: '70svh' }}>
        <div
          className="aspect-[2/3] rounded-2xl bg-[#1A1A1A]/10 animate-pulse"
          style={{ height: 'clamp(340px, 62svh, 580px)' }}
        />
      </div>
    );
  }

  if (reviews.length === 0 && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <span className="text-6xl mb-4">🎬</span>
        <h3 className="text-xl font-bold font-syne tracking-tighter text-[#1A1A1A] mb-2">
          No Reviews Yet
        </h3>
        <p className="text-text-muted text-sm max-w-sm">
          Start your cinematic journal by tapping the + button to write your first review.
        </p>
      </motion.div>
    );
  }

  // 疊卡 — flip through them one at a time.
  if (viewMode === 'deck') {
    return <CardDeck reviews={items} featuredIds={featuredIds} />;
  }
  // 書脊牆 — the default: the whole collection, on a shelf.
  return <SpineShelf reviews={items} featuredIds={featuredIds} />;
}
