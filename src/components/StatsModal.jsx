import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from './LanguageContext';
import { getReviewTotal } from '../utils/constants';

function getLast12Months() {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

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
      totalScoreSum += getReviewTotal(r) ?? 0;

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

    const avgScore = totalReviews > 0 ? (totalScoreSum / totalReviews) : 0;

    // Find top genres
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const topGenre = topGenres.length > 0 ? topGenres[0][0] : '-';

    // Chart 1: Timeline
    const months = getLast12Months();
    const timelineCounts = months.map(m =>
      reviews.reduce((acc, r) => {
        let dates = [];
        if (typeof r.watch_dates === 'string') {
          try { dates = JSON.parse(r.watch_dates); } catch(e) {}
        } else if (Array.isArray(r.watch_dates)) {
          dates = r.watch_dates;
        }
        return acc + dates.filter(d => d.startsWith(m)).length;
      }, 0)
    );
    const maxTimelineCount = Math.max(...timelineCounts, 1);
    const timelinePoints = timelineCounts.map((c, i) =>
      `${(i / 11) * 280 + 10},${70 - (c / maxTimelineCount) * 60}`
    ).join(' ');

    return { 
      totalReviews, 
      avgScore: avgScore.toFixed(1), 
      topGenre,
      topGenres,
      months: months.map(m => m.split('-')[1]), // Only show month number
      timelinePoints,
      maxTimelineCount
    };
  }, [reviews]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none pb-20 md:pb-0">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 pointer-events-auto"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-[90%] max-w-sm bg-[#E8E2D2] p-6 rounded-3xl shadow-2xl border border-[#1A1A1A]/10 pointer-events-auto flex flex-col gap-6 max-h-[85vh] overflow-y-auto scrollbar-hide"
      >
        <div className="flex justify-between items-center shrink-0">
          <h2 className="text-2xl font-black font-[var(--font-syne)] text-[#1A1A1A] tracking-tighter uppercase">
            {t('statistics') || 'Statistics'}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Top 3 numbers */}
        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="bg-[#1A1A1A] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-black font-[var(--font-bebas)] text-[#D480C0] tracking-wider mb-1">
              {stats.totalReviews}
            </span>
            <span className="text-[10px] font-bold font-[var(--font-jetbrains)] text-white/60 uppercase">
              {t('totalReviews') || 'Total Reviews'}
            </span>
          </div>

          <div className="bg-[#1A1A1A] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-black font-[var(--font-bebas)] text-[#FE494A] tracking-wider mb-1 flex items-center gap-1">
              <span className="text-xl">✨</span> {stats.avgScore}
            </span>
            <span className="text-[10px] font-bold font-[var(--font-jetbrains)] text-white/60 uppercase">
              {t('averageScore') || 'Average Score'}
            </span>
          </div>
        </div>

        {/* Chart 1: Timeline */}
        <div className="bg-[#3B4856] rounded-2xl p-5 flex flex-col gap-3 shadow-inner shrink-0">
          <span className="text-xs font-bold font-[var(--font-jetbrains)] text-white/80 uppercase">
            {t('watchingTimeline') || 'Watching Timeline'}
          </span>
          <div className="w-full h-[80px] relative">
            <svg viewBox="0 0 300 80" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <polyline
                points={stats.timelinePoints}
                fill="none"
                stroke="#D480C0"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {stats.timelinePoints.split(' ').map((pt, i) => {
                const [cx, cy] = pt.split(',');
                return (
                  <circle key={i} cx={cx} cy={cy} r="4" fill="#FE494A" />
                );
              })}
            </svg>
            <div className="flex justify-between mt-1 text-[8px] text-white/50 font-bold font-[var(--font-jetbrains)]">
              <span>{stats.months[0]}</span>
              <span>{stats.months[11]}</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Top Genres */}
        <div className="bg-[#1A1A1A] rounded-2xl p-5 flex flex-col gap-3 shrink-0">
          <span className="text-xs font-bold font-[var(--font-jetbrains)] text-white/80 uppercase">
            {t('genreBreakdown') || 'Genre Breakdown'}
          </span>
          <div className="flex flex-col gap-2.5">
            {stats.topGenres.map(([genre, count], idx) => {
              const maxCount = Math.max(stats.topGenres[0][1], 1);
              const percentage = (count / maxCount) * 100;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-16 text-[10px] font-bold text-white/70 truncate text-right shrink-0">
                    {t(genre) || genre}
                  </span>
                  <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[#FE494A] to-[#D480C0]"
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.1 * idx, ease: "easeOut" }}
                    />
                  </div>
                  <span className="w-4 text-[10px] font-black text-white/90 text-left shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[10px] text-[#1A1A1A]/40 font-[var(--font-inter)] font-medium px-2 shrink-0">
          {t('statsDesc') || 'Keep watching movies to build your cinematic profile.'}
        </p>
      </motion.div>
    </div>
  );
}
