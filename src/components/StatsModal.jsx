import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from './LanguageContext';
import { computeEntertainment, computeCinematic, computeTotal } from '../utils/constants';

export default function StatsModal({ isOpen, onClose, reviews = [] }) {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { totalReviews: 0, avgScore: 0, topGenre: '-' };
    }

    const totalReviews = reviews.length;
    
    // Calculate average score
    let totalScoreSum = 0;
    let genreCounts = {};

    reviews.forEach(r => {
      const ent = computeEntertainment(r.emotion || 0, r.pacing || 0);
      const cin = computeCinematic(r.acting || 0, r.cinematography || 0, r.soundtrack || 0);
      totalScoreSum += computeTotal(ent, cin);

      let gList = [];
      if (typeof r.genres === 'string') {
        try { gList = JSON.parse(r.genres); } catch(e) {}
      } else if (Array.isArray(r.genres)) {
        gList = r.genres;
      }
      
      gList.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });

    const avgScore = totalScoreSum / totalReviews;

    // Find top genre
    let topGenre = '-';
    let maxCount = 0;
    for (const [g, count] of Object.entries(genreCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topGenre = g;
      }
    }

    return { totalReviews, avgScore: avgScore.toFixed(1), topGenre };
  }, [reviews]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none pb-24 md:pb-6">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-[90%] max-w-sm bg-[#E8E2D2] p-6 rounded-3xl shadow-2xl border border-[#1A1A1A]/10 pointer-events-auto flex flex-col gap-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black font-syne text-[#1A1A1A] tracking-tighter uppercase">
            {t('statistics') || 'Statistics'}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1A1A1A] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-black font-bebas text-[#D480C0] tracking-wider mb-1">
              {stats.totalReviews}
            </span>
            <span className="text-[10px] font-bold font-jetbrains text-white/60 uppercase">
              {t('totalReviews') || 'Total Reviews'}
            </span>
          </div>

          <div className="bg-[#1A1A1A] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-black font-bebas text-[#FE494A] tracking-wider mb-1 flex items-center gap-1">
              <span className="text-xl">✨</span> {stats.avgScore}
            </span>
            <span className="text-[10px] font-bold font-jetbrains text-white/60 uppercase">
              {t('averageScore') || 'Average Score'}
            </span>
          </div>
        </div>

        <div className="bg-[#3B4856] rounded-2xl p-5 flex items-center justify-between shadow-inner">
          <span className="text-xs font-bold font-jetbrains text-white/80 uppercase">
            {t('topGenre') || 'Top Genre'}
          </span>
          <span className="text-lg font-bold font-syne text-[#D480C0] tracking-wider uppercase">
            {t(stats.topGenre) || stats.topGenre}
          </span>
        </div>

        <p className="text-center text-[10px] text-[#1A1A1A]/40 font-inter font-medium px-2">
          {t('statsDesc') || 'Keep watching movies to build your cinematic profile.'}
        </p>
      </motion.div>
    </div>
  );
}
