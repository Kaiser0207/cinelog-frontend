import React, { useMemo, useState } from 'react';
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

function parseGenres(r) {
  if (typeof r.genres === 'string') {
    try { return JSON.parse(r.genres); } catch { return []; }
  }
  return Array.isArray(r.genres) ? r.genres : [];
}

export default function StatsModal({ isOpen, onClose, reviews = [] }) {
  const { t } = useLanguage();
  const [year, setYear] = useState('all');

  // Distinct years present in any watch date, newest first.
  const allYears = useMemo(() => {
    const ys = new Set();
    reviews.forEach((r) => parseDates(r).forEach((d) => {
      const y = String(d).slice(0, 4);
      if (/^\d{4}$/.test(y)) ys.add(y);
    }));
    return Array.from(ys).sort((a, b) => b.localeCompare(a));
  }, [reviews]);

  const stats = useMemo(() => {
    const months = year === 'all'
      ? getLast12Months()
      : Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    const monthLabels = months.map((m) => m.split('-')[1]);

    const base = {
      totalReviews: 0, avgScore: '—', watchCount: 0,
      topGenres: [], genreAvg: [], highest: null, lowest: null,
      timeline: months.map(() => 0), monthLabels, maxCount: 1, hasTimeline: false,
    };
    if (!reviews || reviews.length === 0) return base;

    // Scope = reviews with at least one watch in the selected year (or all).
    const inScope = year === 'all'
      ? reviews
      : reviews.filter((r) => parseDates(r).some((d) => String(d).startsWith(year)));

    let scoreSum = 0;
    let scoredCount = 0;
    const scored = [];
    const genreCount = {};
    const genreScoreSum = {};
    const genreScoreN = {};

    inScope.forEach((r) => {
      const tot = getReviewTotal(r);
      if (tot != null) {
        scoreSum += tot;
        scoredCount += 1;
        scored.push({ title: r.title || '—', score: tot });
      }
      parseGenres(r).forEach((g) => {
        genreCount[g] = (genreCount[g] || 0) + 1;
        if (tot != null) {
          genreScoreSum[g] = (genreScoreSum[g] || 0) + tot;
          genreScoreN[g] = (genreScoreN[g] || 0) + 1;
        }
      });
    });

    scored.sort((a, b) => b.score - a.score);

    const timeline = months.map((m) =>
      inScope.reduce((acc, r) => acc + parseDates(r).filter((d) => String(d).startsWith(m)).length, 0)
    );
    const watchCount = year === 'all'
      ? reviews.reduce((acc, r) => acc + parseDates(r).length, 0)
      : reviews.reduce((acc, r) => acc + parseDates(r).filter((d) => String(d).startsWith(year)).length, 0);

    return {
      totalReviews: inScope.length,
      avgScore: scoredCount > 0 ? (scoreSum / scoredCount).toFixed(1) : '—',
      watchCount,
      topGenres: Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 6),
      genreAvg: Object.keys(genreScoreN)
        .map((g) => [g, genreScoreSum[g] / genreScoreN[g]])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6),
      highest: scored[0] || null,
      lowest: scored.length > 1 ? scored[scored.length - 1] : null,
      timeline,
      monthLabels,
      maxCount: Math.max(...timeline, 1),
      hasTimeline: timeline.some((c) => c > 0),
    };
  }, [reviews, year]);

  if (!isOpen) return null;

  const YEARS = ['all', ...allYears];

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none pb-[calc(4.25rem+env(safe-area-inset-bottom,0px)+1rem)] md:pb-0">
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
        className="relative w-[90%] max-w-sm bg-[#E8E2D2] p-6 rounded-3xl shadow-2xl border border-[#1A1A1A]/10 pointer-events-auto flex flex-col gap-5 max-h-[85vh] overflow-y-auto scrollbar-hide"
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

        {/* Year selector */}
        {allYears.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide shrink-0 -mx-1 px-1">
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  year === y ? 'bg-[#FE494A] text-white' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
                }`}
              >
                {y === 'all' ? (t('allYears') || '全部') : y}
              </button>
            ))}
          </div>
        )}

        {/* Top 3 numbers */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          {[
            { v: stats.totalReviews, c: '#D480C0', label: t('totalReviews') || 'Reviews' },
            { v: stats.avgScore, c: '#FE494A', label: t('averageScore') || 'Avg Score', star: true },
            { v: stats.watchCount, c: '#D480C0', label: t('watches') || 'Watches' },
          ].map((s, i) => (
            <div key={i} className="bg-[#1A1A1A] rounded-2xl p-3 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black font-[var(--font-bebas)] tracking-wider flex items-center gap-0.5" style={{ color: s.c }}>
                {s.star && <span className="text-base">✨</span>}{s.v}
              </span>
              <span className="text-[9px] font-bold font-[var(--font-jetbrains)] text-white/60 uppercase mt-1 text-center leading-tight">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Highest / Lowest rated */}
        {(stats.highest || stats.lowest) && (
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {[
              { label: t('highest') || 'Highest', item: stats.highest, c: '#FE494A' },
              { label: t('lowest') || 'Lowest', item: stats.lowest, c: '#3B4856' },
            ].map((h, i) => (
              <div key={i} className="bg-[#1A1A1A] rounded-2xl p-3 flex flex-col gap-1 justify-center">
                <span className="text-[9px] font-bold font-[var(--font-jetbrains)] uppercase" style={{ color: h.c }}>
                  {h.label}
                </span>
                {h.item ? (
                  <>
                    <span className="text-sm font-bold text-white truncate">{h.item.title}</span>
                    <span className="text-lg font-black font-[var(--font-bebas)]" style={{ color: h.c }}>
                      {h.item.score?.toFixed?.(1) ?? h.item.score}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-white/30">—</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timeline — bar chart, every month labelled, no distortion */}
        <div className="bg-[#3B4856] rounded-2xl p-5 flex flex-col gap-3 shadow-inner shrink-0">
          <span className="text-xs font-bold font-[var(--font-jetbrains)] text-white/80 uppercase">
            {t('watchingTimeline') || 'Watching Timeline'}
          </span>
          {!stats.hasTimeline ? (
            <p className="text-center text-white/40 text-xs py-6">{t('noRecords') || '尚無觀影紀錄'}</p>
          ) : (
            <div className="flex items-end justify-between gap-1 h-[96px]">
              {stats.timeline.map((c, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className={`text-[8px] font-bold leading-none ${c > 0 ? 'text-white/70' : 'text-transparent'}`}>{c}</span>
                  <motion.div
                    className="w-full rounded-t bg-gradient-to-t from-[#FE494A] to-[#D480C0]"
                    initial={{ height: 0 }}
                    animate={{ height: `${(c / stats.maxCount) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.04 * i, ease: 'easeOut' }}
                    style={{ minHeight: c > 0 ? 4 : 2, opacity: c > 0 ? 1 : 0.18 }}
                  />
                  <span className="text-[7px] text-white/40 font-[var(--font-jetbrains)] leading-none">{stats.monthLabels[i]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Genre × average score */}
        {stats.genreAvg.length > 0 && (
          <div className="bg-[#1A1A1A] rounded-2xl p-5 flex flex-col gap-3 shrink-0">
            <span className="text-xs font-bold font-[var(--font-jetbrains)] text-white/80 uppercase">
              {t('genreScores') || 'Genre Scores'}
            </span>
            <div className="flex flex-col gap-2.5">
              {stats.genreAvg.map(([genre, avg], idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-16 text-[10px] font-bold text-white/70 truncate text-right shrink-0">
                    {t(genre) || genre}
                  </span>
                  <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#FE494A] to-[#D480C0]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(avg / 10) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="w-7 text-[10px] font-black text-white/90 text-left shrink-0 tabular-nums">
                    {avg.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Genre breakdown (count) */}
        {stats.topGenres.length > 0 && (
          <div className="bg-[#1A1A1A] rounded-2xl p-5 flex flex-col gap-3 shrink-0">
            <span className="text-xs font-bold font-[var(--font-jetbrains)] text-white/80 uppercase">
              {t('genreBreakdown') || 'Genre Breakdown'}
            </span>
            <div className="flex flex-col gap-2.5">
              {stats.topGenres.map(([genre, count], idx) => {
                const maxCount = Math.max(stats.topGenres[0][1], 1);
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-16 text-[10px] font-bold text-white/70 truncate text-right shrink-0">
                      {t(genre) || genre}
                    </span>
                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#FE494A] to-[#D480C0]"
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxCount) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="w-4 text-[10px] font-black text-white/90 text-left shrink-0">{count}</span>
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
