import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReviewCard, { ReviewCardSkeleton } from './ReviewCard';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { API_URL, flattenReview } from '../utils/constants';

const LIMIT = 12;

export default function ReviewFeed({ sort = 'newest', genre = '' }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchReviews = useCallback(async (offset = 0, reset = false) => {
    if (loading) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: LIMIT.toString(),
        sort,
      });
      if (genre) params.append('genre', genre);

      const res = await fetch(`${API_URL}/api/reviews?${params}`);
      if (res.ok) {
        const data = await res.json();
        const items = (data.reviews || data || []).map(flattenReview);

        if (reset) {
          setReviews(items);
        } else {
          setReviews((prev) => [...prev, ...items]);
        }

        setHasMore(items.length >= LIMIT);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [sort, genre, loading]);

  // Reset on sort/genre change
  useEffect(() => {
    setReviews([]);
    setHasMore(true);
    setInitialLoad(true);
    fetchReviews(0, true);
  }, [sort, genre]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchReviews(reviews.length);
    }
  }, [loading, hasMore, reviews.length, fetchReviews]);

  const sentinelRef = useInfiniteScroll(loadMore, loading);

  if (initialLoad) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <ReviewCardSkeleton key={i} />
        ))}
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
        <h3 className="text-xl font-bold font-[var(--font-outfit)] text-text-primary mb-2">
          No Reviews Yet
        </h3>
        <p className="text-text-muted text-sm max-w-sm">
          Start your cinematic journal by tapping the + button to write your first review.
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 pb-12">
        {reviews.map((review, i) => (
          <div key={review.id} className="break-inside-avoid" data-cursor="READ">
            <ReviewCard review={review} index={i % LIMIT} />
          </div>
        ))}
        {loading &&
          [...Array(3)].map((_, i) => (
            <div key={`skel-${i}`} className="break-inside-avoid">
              <ReviewCardSkeleton />
            </div>
          ))}
      </div>

      {/* Sentinel for infinite scroll */}
      {hasMore && <div ref={sentinelRef} className="h-20" />}
    </>
  );
}
