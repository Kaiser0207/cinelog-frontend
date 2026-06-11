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

function parseDates(r) {
  if (typeof r.watch_dates === 'string') {
    try { return JSON.parse(r.watch_dates); } catch { return []; }
  }
  return Array.isArray(r.watch_dates) ? r.watch_dates : [];
}

export default function StatsModal({ isOpen, onClose, reviews = [] }) {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    const months = getLast12Months();
    const monthLabels = months.map((m) => m.split('-')[1]); // month number only
    // Always return a consistent shape so an empty dataset never crashes the render.
    const base = {
      totalReviews: 0,
      avgScore: '—',
      thisYear: 0,
      topGenres: [],
      timeline: months.map(() => 0),
      monthLabels,
      maxCount: 1,
      totalWatches: 0,
    };
    if (!reviews || reviews.length === 0) return base;

    const year = String(new Date().getFullYear());
    let scoreSum = 0;
    let scoredCount = 0; // only reviews that actually have a total
    let thisYear = 0;
    const genreCounts = {};

    reviews.forEach((r) => {
      const tot = getReviewTotal(r);
      if (tot != null) {
        scoreSum += tot;
        scoredCount += 1;
      }

      let gList = [];
      if (typeof r.genres === 'string') {
        try { gList = JSON.parse(r.genres); } catch { /* ignore */ }
      } else if (Array.isArray(r.genres)) {
        gList = r.genres;
      }
      gList.forEach((g) => { genreCounts[g] = (genreCounts[g] || 0) + 1; });

      parseDates(r).forEach((d) => { if (String(d).startsWith(year)) thisYear += 1; });
    });

    const timeline = months.map((m) =>
      reviews.reduce((acc, r) => acc + parseDates(r).filter((d) => String(d).startsWith(m)).length, 0)
    );

    return {
      totalReviews: reviews.length,
      avgScore: scoredCount > 0 ? (scoreSum / scoredCount).toFixed(1) : '—',
      thisYear,
      topGenres: Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 6),
      timeline,
      monthLabels,
      maxCount: Math.max(...timeline, 1),
      totalWatches: timeline.reduce((a, b) => a + b, 0),
    };
  }, [reviews]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none pb-[calc(4.25rem+env(safe-area-inset-bottom,0px)+1rem)] md:pb-0">
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
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
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
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="bg-[#1A1A1A] rounded-2xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black font-[var(--font-bebas)] text-[#D480C0] tracking-wider">
              {stats.totalReviews}
            </span>
            <span className="text-[9px] font-bold font-[var(--font-jetbrains)] text-white/60 uppercase mt-1 text-center leading-tight">
              {t('totalReviews') || 'Reviews'}
            </span>
          </div>

          <div className="bg-[#1A1A1A] rounded-2xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black font-[var(--font-bebas)] text-[#FE494A] tracking-wider flex items-center gap-0.5">
              <span className="text-base">✨</span>{stats.avgScore}
            </span>
            <span className="text-[9px] font-bold font-[var(--font-jetbrains)] text-white/60 uppercase mt-1 text-center leading-tight">
              {t('averageScore') || 'Avg Score'}
            </span>
          </div>

          <div className="bg-[#1A1A1A] rounded-2xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black font-[var(--font-bebas)] text-[#D480C0] tracking-wider">
              {stats.thisYear}
            </span>
            <span className="text-[9px] font-bold font-[var(--font-jetbrains)] text-white/60 uppercase mt-1 text-center leading-tight">
              {t('thisYear') || 'This Year'}
            </span>
          </div>
        </div>

        {/* Chart 1: Timeline — bar chart so dots can't distort + every month is labelled */}
        <div className="bg-[#3B4856] rounded-2xl p-5 flex flex-col gap-3 shadow-inner shrink-0">
          <span className="text-xs font-bold font-[var(--font-jetbrains)] text-white/80 uppercase">
            {t('watchingTimeline') || 'Watching Timeline'}
          </span>
          {stats.totalWatches === 0 ? (
            <p className="text-center text-white/40 text-xs py-6">{t('noRecords') || '尚無觀影紀錄'}</p>
          ) : (
            <div className="flex items-end justify-between gap-1 h-[96px]">
              {stats.timeline.map((c, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className={`text-[8px] font-bold leading-none ${c > 0 ? 'text-white/70' : 'text-transparent'}`}>
                    {c}
                  </span>
                  <motion.div
                    className="w-full rounded-t bg-gradient-to-t from-[#FE494A] to-[#D480C0]"
                    initial={{ height: 0 }}
                    animate={{ height: `${(c / stats.maxCount) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.04 * i, ease: 'easeOut' }}
                    style={{ minHeight: c > 0 ? 4 : 2, opacity: c > 0 ? 1 : 0.18 }}
                  />
                  <span className="text-[7px] text-white/40 font-[var(--font-jetbrains)] leading-none">
                    {stats.monthLabels[i]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart 2: Top Genres */}
        {stats.topGenres.length > 0 && (
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
                        transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
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
        )}

        <p className="text-center text-[10px] text-[#1A1A1A]/40 font-[var(--font-inter)] font-medium px-2 shrink-0">
          {t('statsDesc') || 'Keep watching movies to build your cinematic profile.'}
        </p>
      </motion.div>
    </div>
  );
}
