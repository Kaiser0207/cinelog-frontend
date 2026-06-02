import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReviewDetail from '../components/ReviewDetail';
import ReviewEditor from '../components/ReviewEditor';
import { API_URL, flattenReview } from '../utils/constants';

export default function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchReview();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/reviews/${id}`);
      if (res.ok) {
        const data = await res.json();
        setReview(flattenReview(data));
      } else if (res.status === 404) {
        setError('not_found');
      } else {
        throw new Error('Failed to load review');
      }
    } catch (err) {
      if (!error) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="text-2xl font-bold font-[var(--font-outfit)] text-text-primary mb-2">
          Review Not Found
        </h2>
        <p className="text-text-muted mb-6">
          This review may have been deleted or the link is invalid.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-[#9D174D] hover:bg-[#FBA3B5] text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-all border-none shadow-sm cursor-pointer"
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
    >
      <ReviewDetail
        review={review}
        onEdit={() => setShowEditor(true)}
        onDeleted={() => navigate('/')}
      />

      <AnimatePresence>
        {showEditor && (
          <ReviewEditor
            review={review}
            onClose={() => setShowEditor(false)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
