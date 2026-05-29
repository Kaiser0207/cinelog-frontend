import { useState } from 'react';
import { motion } from 'framer-motion';
import { API_URL } from '../utils/constants';
import { useToast } from './Toast';

export default function AIPredictButton({ reviewText, onPredict, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handlePredict = async () => {
    if (!reviewText || reviewText.trim().length < 10) {
      addToast('Write at least a few sentences before predicting scores.', 'info');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_text: reviewText }),
      });

      if (res.ok) {
        const scores = await res.json();
        onPredict(scores);
        addToast('AI scores predicted! Adjust as needed.', 'success');
      } else {
        throw new Error('API error');
      }
    } catch {
      addToast('AI prediction unavailable. Please set manually.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handlePredict}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      className={`
        relative w-full py-3 px-5 rounded-xl font-semibold text-sm
        bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500
        text-white shadow-lg
        transition-all duration-300
        disabled:opacity-40 disabled:cursor-not-allowed
        overflow-hidden
        ${loading ? 'animate-pulse' : ''}
      `}
      style={{
        boxShadow: loading
          ? '0 0 24px rgba(168, 85, 247, 0.4), 0 0 48px rgba(168, 85, 247, 0.15)'
          : '0 0 12px rgba(168, 85, 247, 0.2)',
      }}
    >
      {loading && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className="inline-block"
            >
              🎬
            </motion.span>
            Analyzing Review...
          </>
        ) : (
          <>
            ✨ AI Predict Scores
          </>
        )}
      </span>
    </motion.button>
  );
}
