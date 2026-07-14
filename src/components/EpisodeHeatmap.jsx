import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getEpisodeColor, seasonAverage } from '../utils/constants';

/**
 * IMDb-style per-episode heatmap.
 *
 * Read-only (detail page): a grid of episode cells coloured by their 0-10 score
 * (unrated = faded); tap a cell to see its exact score.
 *
 * Editable (review editor): same grid, but tapping a cell opens a docked slider
 * to set / clear that episode's score. Changes flow up via onChange as a fresh
 * episode_scores array — only rated episodes are kept.
 */
export default function EpisodeHeatmap({
  seasons = [],
  episodeScores = [],
  editable = false,
  onChange,
}) {
  const [active, setActive] = useState(null); // { season, episode }

  const sorted = [...seasons]
    .filter((s) => (s.episode_count || 0) > 0)
    .sort((a, b) => a.season_number - b.season_number);

  if (sorted.length === 0) return null;

  const scoreMap = new Map(
    (episodeScores || []).map((e) => [`${e.season_number}-${e.episode_number}`, e]),
  );
  const getScore = (s, e) => {
    const hit = scoreMap.get(`${s}-${e}`);
    return hit && typeof hit.score === 'number' ? hit.score : null;
  };

  const writeScore = (season, episode, score) => {
    if (!onChange) return;
    const others = (episodeScores || []).filter(
      (e) => !(e.season_number === season && e.episode_number === episode),
    );
    const next =
      score == null
        ? others
        : [...others, { season_number: season, episode_number: episode, score, note: null }];
    next.sort(
      (a, b) => a.season_number - b.season_number || a.episode_number - b.episode_number,
    );
    onChange(next);
  };

  const activeScore = active ? getScore(active.season, active.episode) : null;

  return (
    <div className="space-y-5">
      {sorted.map((season) => {
        const sNum = season.season_number;
        const avg = seasonAverage(episodeScores, sNum);
        return (
          <div key={sNum} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h4 className="text-sm font-bold text-text-primary">
                第 {sNum} 季
                {season.name && season.name !== `第 ${sNum} 季` && season.name !== `Season ${sNum}` && (
                  <span className="text-text-dim font-medium ml-2 text-xs">{season.name}</span>
                )}
              </h4>
              {avg != null && (
                <span
                  className="text-xs font-black tabular-nums px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: getEpisodeColor(avg) }}
                >
                  平均 {avg.toFixed(1)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: season.episode_count }, (_, i) => i + 1).map((epNum) => {
                const score = getScore(sNum, epNum);
                const color = getEpisodeColor(score);
                const isActive = active && active.season === sNum && active.episode === epNum;
                return (
                  <button
                    key={epNum}
                    type="button"
                    disabled={!editable && score == null}
                    onClick={() =>
                      setActive(isActive ? null : { season: sNum, episode: epNum })
                    }
                    title={`E${epNum}${score != null ? ` · ${score.toFixed(1)}` : ''}`}
                    className={`w-9 h-9 rounded-md flex items-center justify-center text-[11px] font-bold tabular-nums transition-all ${
                      editable ? 'cursor-pointer active:scale-90' : score != null ? 'cursor-pointer' : 'cursor-default'
                    } ${isActive ? 'ring-2 ring-offset-1 ring-[#1A1A1A] ring-offset-bg-surface scale-105' : ''}`}
                    style={
                      color
                        ? { backgroundColor: color, color: '#fff' }
                        : {
                            backgroundColor: 'var(--color-bg-card)',
                            color: 'var(--color-text-dim)',
                            border: '1px solid var(--color-border-subtle)',
                          }
                    }
                  >
                    {score != null ? score.toFixed(1).replace(/\.0$/, '') : epNum}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Docked editor / detail popover for the tapped episode */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="sticky bottom-2 z-10 glass rounded-xl border border-border-subtle p-4 shadow-lg bg-bg-elevated"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-text-primary">
                第 {active.season} 季 · 第 {active.episode} 集
              </span>
              <div className="flex items-center gap-3">
                <span
                  className="text-lg font-black tabular-nums"
                  style={{ color: activeScore != null ? getEpisodeColor(activeScore) : 'var(--color-text-dim)' }}
                >
                  {activeScore != null ? activeScore.toFixed(1) : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="w-7 h-7 rounded-full bg-[#E8E2D2] text-[#1A1A1A] flex items-center justify-center text-xs font-bold active:scale-90 transition-transform"
                  aria-label="關閉"
                >
                  ✕
                </button>
              </div>
            </div>

            {editable ? (
              <div>
                {/* extra vertical room so the 28px thumb never overlaps the
                    labels below, and an explicit track so it stays visible */}
                <div className="relative py-2.5">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={activeScore ?? 7}
                    onChange={(e) => {
                      writeScore(active.season, active.episode, parseFloat(e.target.value));
                      if (navigator.vibrate) navigator.vibrate(2);
                    }}
                    className="relative z-10 w-full cursor-pointer"
                    style={{
                      background: getEpisodeColor(activeScore ?? 7) || 'var(--color-text-primary)',
                      backgroundSize: `${((activeScore ?? 7) / 10) * 100}% 100%`,
                      backgroundRepeat: 'no-repeat',
                      backgroundColor: 'var(--color-border-subtle)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-text-dim">拖曳設定分數</span>
                  <button
                    type="button"
                    onClick={() => writeScore(active.season, active.episode, null)}
                    className="text-xs font-bold text-[#FE494A] active:scale-95 transition-transform"
                  >
                    清除此集
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-muted">
                {activeScore != null ? '此集評分' : '這一集尚未評分'}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
