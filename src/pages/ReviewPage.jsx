import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReviewDetail from '../components/ReviewDetail';
import { API_URL, flattenReview } from '../utils/constants';

const ReviewEditor = lazy(() => import('../components/ReviewEditor'));

export default function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // When arriving from the feed we already have the full review object — render
  // it instantly and only fall back to a skeleton on a cold/direct load.
  const preloaded =
    location.state?.review && String(location.state.review.id) === String(id)
      ? location.state.review
      : null;
  const [review, setReview] = useState(preloaded ? flattenReview(preloaded) : null);
  const [loading, setLoading] = useState(!preloaded);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    let cancelled = false;

    const hasPreload =
      location.state?.review && String(location.state.review.id) === String(id);
    if (hasPreload) {
      // Show the cached review immediately; refresh silently below.
      setReview(flattenReview(location.state.review));
      setLoading(false);
    } else {
      setReview(null);
      setLoading(true);
    }
    setError(null);

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/reviews/${id}`);
        if (cancelled) return;
        if (res.ok) {
          setReview(flattenReview(await res.json()));
        } else if (res.status === 404) {
          if (!hasPreload) setError('not_found');
        } else {
          throw new Error('Failed to load review');
        }
      } catch (err) {
        if (!cancelled && !hasPreload) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaved = (updated) => {
    setReview(flattenReview(updated));
    setShowEditor(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        {/* Hero Skeleton */}
        <div className="h-[50vh] skeleton" />
        <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="skeleton h-48 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
          </div>
          <div className="skeleton h-6 w-3/4 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
        </div>
      </div>
    );
  }

  if (error === 'not_found' || !review) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col items-center justify-center text-center p-6"
      >
        <span className="text-7xl mb-4">🎬</span>
        <h2 className="text-2xl font-bold font-syne tracking-tightertext-text-primary mb-2">
          Review Not Found
        </h2>
        <p className="text-text-muted mb-6">
          This review may have been deleted or the link is invalid.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-[#FE494A] hover:bg-[#FE494A] text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-all border-none shadow-sm cursor-pointer"
        >
          ← Back to Feed
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <ReviewDetail
        review={review}
        onEdit={() => setShowEditor(true)}
        onDeleted={() => navigate('/')}
      />

      <Suspense fallback={null}>
        <AnimatePresence>
          {showEditor && (
            <ReviewEditor
              review={review}
              onClose={() => setShowEditor(false)}
              onSaved={handleSaved}
            />
          )}
        </AnimatePresence>
      </Suspense>
    </motion.div>
  );
}
