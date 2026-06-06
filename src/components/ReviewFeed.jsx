import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import ReviewCard, { ReviewCardSkeleton } from './ReviewCard';
import ReviewListRow from './ReviewListRow';
import HeroCard from './HeroCard';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { API_URL, flattenReview, TMDB_IMG_BASE } from '../utils/constants';
import { useLanguage } from './LanguageContext';

const LIMIT = 12;

export default function ReviewFeed({ sort = 'newest', genre = '', searchQuery = '', searchMode = 'standard', viewMode = 'grid', gyroPermission, onReviewsLoaded }) {
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

  const [recentlyWatchedData, setRecentlyWatchedData] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/reviews?limit=100&sort=newest`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const rawItems = data.reviews || data || [];
        const items = rawItems.map(flattenReview);
        const sorted = [...items].sort((a, b) => {
          const getLatestDate = (item) => {
            let dates = [];
            try {
              dates = typeof item.watch_dates === 'string'
                ? JSON.parse(item.watch_dates || '[]')
                : (item.watch_dates || []);
            } catch (e) { dates = []; }
            return dates.length > 0 ? dates[dates.length - 1] : '1970-01-01';
          };
          const diff = new Date(getLatestDate(b)).getTime() - new Date(getLatestDate(a)).getTime();
          return diff !== 0 ? diff : new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        setRecentlyWatchedData(sorted.slice(0, 5));
      })
      .catch(err => console.error('Failed to fetch recently watched:', err));
  }, []);

  const recentlyWatchedReviews = useMemo(() => {
    if (sort !== 'newest' || searchQuery || reviews.length < 2) return [];
    return recentlyWatchedData;
  }, [reviews, sort, searchQuery, recentlyWatchedData]);

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
        <h3 className="text-xl font-bold font-syne tracking-tighter text-[#1A1A1A] mb-2">
          No Reviews Yet
        </h3>
        <p className="text-text-muted text-sm max-w-sm">
          Start your cinematic journal by tapping the + button to write your first review.
        </p>
      </motion.div>
    );
  }

  const showHero = recentlyWatchedReviews.length > 0 && viewMode === 'grid';
  const heroReview = showHero ? recentlyWatchedReviews[0] : null;
  const horizontalScrollReviews = showHero ? recentlyWatchedReviews.slice(0, 5) : [];

  return (
    <>
      {showHero && (
        <div className="md:hidden flex flex-col w-full mb-8">
          <HeroCard review={heroReview} />
          
          {horizontalScrollReviews.length > 0 && (
            <div className="flex flex-col w-full mt-4">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-bold font-syne uppercase tracking-wider text-text-dim">
                  {t('recentlyWatched')}
                </h3>
                <div className="h-px flex-1 bg-border-subtle" />
              </div>
              
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 scrollbar-none w-full">
                {horizontalScrollReviews.map((rev) => (
                  <div 
                    key={rev.id}
                    onClick={() => navigate(`/review/${rev.id}`)}
                    className="flex flex-col gap-2 flex-shrink-0 w-[130px] snap-start cursor-pointer group"
                  >
                    <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#1A1A1A] shadow-md group-active:scale-95 transition-transform duration-200 relative">
                      {rev.poster_path && (
                        <img 
                          src={`${TMDB_IMG_BASE}w342${rev.poster_path}`} 
                          alt={rev.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute top-2 right-2 bg-[#1A1A1A]/80 backdrop-blur-md text-[#E8E2D2] px-1.5 py-0.5 rounded flex items-center gap-1 border border-white/10 shadow-sm">
                        <span className="text-[10px]">✨</span>
                        <span className="text-[10px] font-bold font-bebas tracking-wider">
                          {rev.total_score ? rev.total_score.toFixed(1) : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <h4 className="text-xs font-bold font-syne text-[#1A1A1A] truncate w-full uppercase">
                        {rev.title}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <motion.div 
        layout="position"
        className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" 
          : "flex flex-col gap-0"}
      >
        {reviews.map((review, i) => {
          const isHero = heroReview && review.id === heroReview.id;
          
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
