import { useState } from 'react';
import { motion } from 'framer-motion';
import { API_URL } from '../utils/constants';
import { useToast } from './Toast';

export default function AIPredictButton({ reviewText, onPredict, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handlePredict = async () => {
    if (!reviewText || reviewText.trim().length < 10) {
      addToast('請輸入至少幾句話再讓 AI 預測評分。', 'info');
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
        addToast('AI 預測成功！你可以再手動微調。', 'success');
      } else {
        throw new Error('API error');
      }
    } catch {
      addToast('AI 預測目前無法使用，請手動評分。', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handlePredict}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.01 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.99 } : {}}
      className={`
        relative w-full py-3 px-5 rounded-full font-bold text-sm
        bg-[#9D174D] hover:bg-[#FBA3B5] text-black shadow-sm
        transition-all duration-300
        disabled:opacity-40 disabled:cursor-not-allowed
        overflow-hidden border-none cursor-pointer
        ${loading ? 'animate-pulse' : ''}
      `}
    >
      {loading && (
        <motion.div
          className="absolute inset-0 bg-white/20"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
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
            分析影評中...
          </>
        ) : (
          <>
            ✨ 讓 AI 幫我評分
          </>
        )}
      </span>
    </motion.button>
  );
}
