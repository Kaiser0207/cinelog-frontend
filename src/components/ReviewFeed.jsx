import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import ReviewCard, { ReviewCardSkeleton } from './ReviewCard';
import ReviewListRow from './ReviewListRow';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { API_URL, flattenReview } from '../utils/constants';

const LIMIT = 12;

export default function ReviewFeed({ sort = 'newest', genre = '', searchQuery = '', searchMode = 'standard', viewMode = 'grid' }) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // Global Hover State for List View Reveal
  const [hoveredImage, setHoveredImage] = useState(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 300 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (!hoveredImage) return;
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [hoveredImage, mouseX, mouseY]);

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
        params.append('limit', '50'); // Fetch up to 50 results for search
      } else {
        params.append('offset', offset.toString());
        params.append('limit', LIMIT.toString());
        params.append('sort', sort);
        if (genre) params.append('genre', genre);
      }

      const res = await fetch(`${url}?${params}`);
      if (res.ok) {
        const data = await res.json();
        
        // Handle different response formats (search vs regular)
        const rawItems = searchQuery ? (data.results || []) : (data.reviews || data || []);
        const items = rawItems.map(flattenReview);

        if (reset) {
          setReviews(items);
        } else {
          setReviews((prev) => [...prev, ...items]);
        }

        // Disable infinite scroll for search
        if (searchQuery) {
          setHasMore(false);
        } else {
          setHasMore(items.length >= LIMIT);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [sort, genre, loading]);

  // Reset on sort/genre/search change
  useEffect(() => {
    setReviews([]);
    setHasMore(true);
    setInitialLoad(true);
    fetchReviews(0, true);
  }, [sort, genre, searchQuery, searchMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchReviews(reviews.length);
    }
  }, [loading, hasMore, reviews.length, fetchReviews]);

  const sentinelRef = useInfiniteScroll(loadMore, loading);

  if (initialLoad) {
    const skeletonCount = searchQuery ? 6 : 12;
    return (
      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" : "flex flex-col gap-0"}>
        {[...Array(skeletonCount)].map((_, i) => (
          viewMode === 'grid' 
            ? <ReviewCardSkeleton key={`initial-skel-${i}`} />
            : <div key={`skel-list-init-${i}`} className="w-full h-16 bg-neutral-900 animate-pulse border-b border-border-subtle" />
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
      <motion.div 
        className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" 
          : "flex flex-col gap-0"}
      >
        {reviews.map((review, i) => (
          viewMode === 'grid' ? (
            <ReviewCard key={review.id} review={review} index={i % LIMIT} />
          ) : (
            <ReviewListRow 
              key={review.id} 
              review={review} 
              index={i % LIMIT} 
              onHover={setHoveredImage} 
              onLeave={() => setHoveredImage(null)} 
              onClick={() => navigate(`/review/${review.id}`)}
            />
          )
        ))}
        {loading &&
          [...Array(3)].map((_, i) => (
            viewMode === 'grid' 
              ? <ReviewCardSkeleton key={`skel-${i}`} />
              : <div key={`skel-list-${i}`} className="w-full h-16 bg-neutral-900 animate-pulse border-b border-border-subtle" />
          ))
        }
      </motion.div>

      {/* Sentinel for infinite scroll */}
      {hasMore && <div ref={sentinelRef} className="h-20" />}

      {/* Global Hover Portal */}
      <AnimatePresence>
        {hoveredImage && viewMode === 'list' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            style={{ x: springX, y: springY }}
            className="fixed top-0 left-0 pointer-events-none z-[999] ml-4 mt-4"
          >
            <img 
              src={hoveredImage} 
              alt="Hover preview" 
              className="w-48 h-72 object-cover rounded-xl shadow-2xl border border-white/10"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
