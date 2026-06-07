import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import ReviewCard, { ReviewCardSkeleton } from './ReviewCard';
import ReviewListRow from './ReviewListRow';
import HeroCarousel from './HeroCarousel';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { API_URL, flattenReview, TMDB_IMG_BASE } from '../utils/constants';
import { useLanguage } from './LanguageContext';

const LIMIT = 12;

export default function ReviewFeed({ sort = 'newest', genre = '', media = '', searchQuery = '', searchMode = 'standard', viewMode = 'grid', gyroPermission, onReviewsLoaded }) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // Global Hover State for List View Reveal
  const [hoveredImage, setHoveredImage] = useState(null);
  
  // Mobile Accordion State
  const [expandedRowId, setExpandedRowId] = useState(null);

  const portalRef = useRef(null);
  const { t } = useLanguage();

  // The Hero "cover" is a single, manually-featured review (admin pins it on
  // the review page). Fetched independently so it isn't tied to pagination
  // or the current sort — it's a deliberate editorial pick, not "most recent".
  const [featuredReviews, setFeaturedReviews] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/reviews/featured`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFeaturedReviews(Array.isArray(data) ? data.map(flattenReview) : []))
      .catch((err) => console.error('Failed to fetch featured reviews:', err));
  }, []);

  // Initialize global mouse tracking for the portal
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (portalRef.current) {
        gsap.to(portalRef.current, {
          x: e.clientX + 16,
          y: e.clientY + 16,
          duration: 0.3,
          ease: "power3.out",
          overwrite: "auto"
        });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
        params.append('limit', '50'); // Fetch up to 50 results for search
      } else {
        params.append('offset', offset.toString());
        params.append('limit', LIMIT.toString());
        params.append('sort', sort);
        if (genre) params.append('genre', genre);
        if (media) params.append('media', media);
      }

      const res = await fetch(`${url}?${params}`);
      if (res.ok) {
        const data = await res.json();
        
        // Handle different response formats (search vs regular)
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
  }, [sort, genre, media, loading]);

  // Reset on sort/genre/media/search change
  useEffect(() => {
    setReviews([]);
    setHasMore(true);
    setInitialLoad(true);
    fetchReviews(0, true);
  }, [sort, genre, media, searchQuery, searchMode]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <h3 className="text-xl font-bold font-syne tracking-tighter text-[#1A1A1A] mb-2">
          No Reviews Yet
        </h3>
        <p className="text-text-muted text-sm max-w-sm">
          Start your cinematic journal by tapping the + button to write your first review.
        </p>
      </motion.div>
    );
  }

  const showHero = featuredReviews.length > 0 && !searchQuery && viewMode === 'grid';
  const featuredIds = new Set(featuredReviews.map((r) => r.id));

  return (
    <>
      {showHero && (
        <div className="w-full mb-8">
          <HeroCarousel reviews={featuredReviews} />
        </div>
      )}

      <motion.div 
        layout="position"
        className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" 
          : "flex flex-col gap-0"}
      >
        {reviews
          .filter((review) => !(showHero && featuredIds.has(review.id)))
          .map((review, i) => {
          if (viewMode === 'grid') {
            return (
              <div key={review.id}>
                <ReviewCard review={review} index={i % LIMIT} gyroPermission={gyroPermission} />
              </div>
            );
          } else {
            return (
              <div key={review.id}>
                <ReviewListRow 
                  review={review} 
                  index={i % LIMIT} 
                  onHover={setHoveredImage} 
                  onLeave={() => setHoveredImage(null)} 
                  isExpanded={expandedRowId === review.id}
                  hasAnyExpanded={expandedRowId !== null}
                  onToggleExpand={() => setExpandedRowId(expandedRowId === review.id ? null : review.id)}
                  onClick={() => navigate(`/review/${review.id}`)}
                />
              </div>
            );
          }
        })}
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
      <div 
        ref={portalRef}
        className="fixed top-0 left-0 pointer-events-none z-[999] will-change-transform"
      >
        <AnimatePresence>
          {hoveredImage && viewMode === 'list' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <img 
                src={hoveredImage} 
                alt="Hover preview" 
                className="w-48 h-72 object-cover rounded-xl shadow-2xl border border-white/10"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
