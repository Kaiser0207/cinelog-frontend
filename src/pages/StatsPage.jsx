import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import StaggeredMenu from '../components/StaggeredMenu';
import { useLanguage } from '../components/LanguageContext';
import { getReviewTotal, flattenReview } from '../utils/constants';
import { loadAllReviews } from '../utils/catalog';
import { matchesViewingPeriod, parseReviewGenres, parseWatchDates } from '../utils/statsData';

/**
 * 觀影統計 — a real page (/stats), not a floating card.
 *
 * It fetches the COMPLETE review set itself rather than taking whatever the home
 * feed's infinite scroll happened to load (12 at a time) — otherwise older films
 * silently vanish from the numbers.
 */

function getLast12Months() {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

export default function StatsPage() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        // Statistics require watch_dates and genres, which the lightweight
        // homepage summary deliberately omits. Full pages are cached separately,
        // so returning to this route does not repeat the whole-collection walk.
        const acc = await loadAllReviews({ view: 'full' });
        if (!cancelled) setData(acc.map(flattenReview));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  // Years are derived from the data — 2027 etc. appears automatically.
  const allYears = useMemo(() => {
    const ys = new Set();
    data.forEach((r) => parseWatchDates(r).forEach((d) => {
      const y = String(d).slice(0, 4);
      if (/^\d{4}$/.test(y)) ys.add(y);
    }));
    return Array.from(ys).sort((a, b) => b.localeCompare(a));
  }, [data]);

  const stats = useMemo(() => {
    // Timeline always shows the year's 12 months (or a rolling last-12 for "all"),
    // so a selected month just highlights its bar rather than collapsing it.
    const months = year === 'all'
      ? getLast12Months()
      : Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    const monthLabels = months.map((m) => m.replace('-', '/'));

    const base = {
      totalReviews: 0, avgScore: '—', watchCount: 0,
      topGenres: [], genreAvg: [], highest: null, lowest: null, rewatch: [],
      timeline: months.map(() => 0), monthLabels, monthKeys: months,
      maxCount: 1, hasTimeline: false,
    };
    if (!data || data.length === 0) return base;

    // Scope = reviews with at least one watch matching the year + month filter.
    const inScope = data.filter((r) => parseWatchDates(r).some((d) => matchesViewingPeriod(d, year, month)));

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
      parseReviewGenres(r).forEach((g) => {
        genreCount[g] = (genreCount[g] || 0) + 1;
        if (tot != null) {
          genreScoreSum[g] = (genreScoreSum[g] || 0) + tot;
          genreScoreN[g] = (genreScoreN[g] || 0) + 1;
        }
      });
    });

    scored.sort((a, b) => b.score - a.score);

    // Most-rewatched: count each film's watch dates that fall in the current
    // scope; >1 means a genuine rewatch (e.g. seen in 2024 AND 2026).
    const rewatch = inScope
      .map((r) => ({
        title: r.title || '—',
        count: parseWatchDates(r).filter((d) => matchesViewingPeriod(d, year, month)).length,
      }))
      .filter((x) => x.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Timeline counts ignore the month filter (they show the whole year context).
    const timeline = months.map((m) =>
      data.reduce((acc, r) => acc + parseWatchDates(r).filter((d) => String(d).startsWith(m)).length, 0)
    );
    const watchCount = data.reduce(
      (acc, r) => acc + parseWatchDates(r).filter((d) => matchesViewingPeriod(d, year, month)).length, 0
    );

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
      rewatch,
      timeline,
      monthLabels,
      monthKeys: months,
      maxCount: Math.max(...timeline, 1),
      hasTimeline: timeline.some((c) => c > 0),
    };
  }, [data, year, month]);

  const monthOptions = useMemo(() => {
    const locale = lang === 'zh' ? 'zh-TW' : 'en';
    return MONTHS.map((value, index) => ({
      value,
      label: new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2020, index, 1)),
    }));
  }, [lang]);
  const selectCls = 'flex-1 text-sm font-bold text-[#1A1A1A] bg-[#F5EFE1] border border-[#1A1A1A]/15 rounded-xl px-3 py-2.5 cursor-pointer';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-dvh relative overflow-x-clip pb-24"
    >
      <StaggeredMenu />

      {/* Page header — the title sits below the fixed hamburger, right-aligned
          back button mirrors it. */}
      <header className="px-5 pt-24 pb-8 max-w-3xl mx-auto flex items-end justify-between gap-4">
        <h1 className="text-5xl md:text-7xl font-black font-nevis tracking-tighter text-[#1A1A1A] uppercase leading-none">
          {t('statistics') || '觀影統計'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="shrink-0 h-11 px-4 rounded-full bg-[#E8E2D2] border border-[#1A1A1A]/10 text-xs font-black font-jetbrains uppercase tracking-wider text-[#1A1A1A] hover:bg-[#FE494A] hover:text-white transition-all shadow-sm active:scale-95"
        >
          ← {t('navHome') || '首頁'}
        </button>
      </header>

      <main className="px-5 max-w-3xl mx-auto flex flex-col gap-5">
        {/* Year + month dropdowns */}
        <div className="grid grid-cols-2 gap-3">
          <label htmlFor="stats-year" className="text-xs font-bold text-text-muted">
            {t('statsYearLabel')}
            <select id="stats-year" value={year} onChange={(e) => setYear(e.target.value)} className={`${selectCls} mt-1 w-full`}>
              <option value="all">{t('allYears') || '全部'}</option>
              {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label htmlFor="stats-month" className="text-xs font-bold text-text-muted">
            {t('statsMonthLabel')}
            <select id="stats-month" value={month} onChange={(e) => setMonth(e.target.value)} className={`${selectCls} mt-1 w-full`}>
              <option value="all">{t('allMonths') || '全部月份'}</option>
              {monthOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>

        {loading && (
          <div className="grid grid-cols-3 gap-3" role="status" aria-label={t('loadingReviews')}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[86px] rounded-2xl bg-[#1A1A1A]/10 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-2xl border border-[#FE494A]/40 bg-[#F5EFE1] p-6 text-center">
            <h2 className="text-xl font-black">{t('statsLoadError')}</h2>
            <p className="mt-2 text-sm text-text-muted">{t('statsLoadErrorDesc')}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-5 rounded-full bg-[#FE494A] px-5 py-2.5 text-sm font-black text-[#1A1A1A]"
            >
              {t('retry')}
            </button>
          </div>
        )}

        <div className={loading || error ? 'hidden' : 'contents'}>
        {/* Top 3 numbers */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { v: stats.totalReviews, c: '#D480C0', label: t('totalReviews') || 'Reviews' },
            { v: stats.avgScore, c: '#FE494A', label: t('averageScore') || 'Avg Score', star: true },
            { v: stats.watchCount, c: '#D480C0', label: t('watches') || 'Watches' },
          ].map((s, i) => (
            <div key={i} className="bg-[#1A1A1A] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-3xl md:text-4xl font-black font-[var(--font-bebas)] tracking-wider flex items-center gap-0.5" style={{ color: s.c }}>
                {s.star && <span className="text-base">✨</span>}{s.v}
              </span>
              <span className="text-xs font-bold font-[var(--font-jetbrains)] text-white/70 uppercase mt-1 text-center leading-tight">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Highest / Lowest rated */}
        {(stats.highest || stats.lowest) && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('highest') || 'Highest', item: stats.highest, c: '#FE494A' },
              { label: t('lowest') || 'Lowest', item: stats.lowest, c: '#3B4856' },
            ].map((h, i) => (
              <div key={i} className="bg-[#1A1A1A] rounded-2xl p-4 flex flex-col gap-1 justify-center">
                <span className="text-xs font-bold font-[var(--font-jetbrains)] uppercase" style={{ color: h.c }}>
                  {h.label}
                </span>
                {h.item ? (
                  <>
                    <span className="text-sm font-bold text-white truncate">{h.item.title}</span>
                    <span className="text-xl font-black font-[var(--font-bebas)]" style={{ color: h.c }}>
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

        {/* Most-rewatched films (only films watched 2+ times in scope) */}
        {stats.rewatch.length > 0 && (
          <div className="bg-[#1A1A1A] rounded-2xl p-5 flex flex-col gap-3">
            <span className="text-xs font-bold font-[var(--font-jetbrains)] text-white/80 uppercase">
              {t('mostWatched') || '重複觀看最多'}
            </span>
            <div className="flex flex-col gap-2.5">
              {stats.rewatch.map((m, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-black font-[var(--font-bebas)] text-white/30 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-[12px] font-bold text-white/85 truncate">{m.title}</span>
                  <span className="flex items-baseline gap-0.5 shrink-0">
                    <span className="text-xs text-white/55">×</span>
                    <span className="text-lg font-black font-[var(--font-bebas)] text-[#FFD15C] tabular-nums leading-none">
                      {m.count}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline — bar chart; selected month is highlighted */}
        <div className="bg-[#3B4856] rounded-2xl p-5 flex flex-col gap-3 shadow-inner">
          <span className="text-xs font-bold font-[var(--font-jetbrains)] text-white/80 uppercase">
            {t('watchingTimeline') || 'Watching Timeline'}
          </span>
          {!stats.hasTimeline ? (
            <p className="text-center text-white/40 text-xs py-6">{t('noRecords') || '尚無觀影紀錄'}</p>
          ) : (
            <div aria-hidden="true" className="flex items-end justify-between gap-1 h-[120px] md:h-[160px]">
              {stats.timeline.map((c, i) => {
                const isSel = month !== 'all' && stats.monthKeys[i].slice(5) === month;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                    <span className={`text-xs font-bold leading-none ${c > 0 ? 'text-white/80' : 'text-transparent'}`}>{c}</span>
                    <motion.div
                      className={`w-full rounded-t bg-gradient-to-t ${isSel ? 'from-[#FFD15C] to-[#FE494A]' : 'from-[#FE494A] to-[#D480C0]'}`}
                      initial={{ height: 0 }}
                      animate={{ height: `${(c / stats.maxCount) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.04 * i, ease: 'easeOut' }}
                      style={{ minHeight: c > 0 ? 4 : 2, opacity: c > 0 || isSel ? 1 : 0.18 }}
                    />
                    <span className={`origin-top-left -rotate-45 whitespace-nowrap text-xs font-[var(--font-jetbrains)] leading-none ${isSel ? 'text-[#FFD15C]' : 'text-white/60'}`}>
                      {stats.monthLabels[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {stats.hasTimeline && (
            <table className="sr-only">
              <caption>{t('timelineTableCaption')}</caption>
              <tbody>
                {stats.monthKeys.map((key, index) => (
                  <tr key={key}>
                    <th scope="row">{stats.monthLabels[index]}</th>
                    <td>{stats.timeline[index]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Genre × average score */}
          {stats.genreAvg.length > 0 && (
            <div className="bg-[#1A1A1A] rounded-2xl p-5 flex flex-col gap-3">
              <span className="text-xs font-bold font-[var(--font-jetbrains)] text-white/80 uppercase">
                {t('genreScores') || 'Genre Scores'}
              </span>
              <div className="flex flex-col gap-2.5">
                {stats.genreAvg.map(([genre, avg], idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-20 text-xs font-bold text-white/75 truncate text-right shrink-0">
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
                    <span className="w-8 text-xs font-black text-white/90 text-left shrink-0 tabular-nums">
                      {avg.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Genre breakdown (count) */}
          {stats.topGenres.length > 0 && (
            <div className="bg-[#1A1A1A] rounded-2xl p-5 flex flex-col gap-3">
              <span className="text-xs font-bold font-[var(--font-jetbrains)] text-white/80 uppercase">
                {t('genreBreakdown') || 'Genre Breakdown'}
              </span>
              <div className="flex flex-col gap-2.5">
                {stats.topGenres.map(([genre, count], idx) => {
                  const maxCount = Math.max(stats.topGenres[0][1], 1);
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-20 text-xs font-bold text-white/75 truncate text-right shrink-0">
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
                      <span className="w-5 text-xs font-black text-white/90 text-left shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#1A1A1A]/60 font-[var(--font-inter)] font-medium px-2 pt-2">
          {t('statsDesc') || 'Keep watching movies to build your cinematic profile.'}
        </p>
        </div>
      </main>
    </motion.div>
  );
}
