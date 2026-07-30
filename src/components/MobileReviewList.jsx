import { Link } from 'react-router';
import {
  MEDIA_BADGES,
  TMDB_IMG_BASE,
  formatDate,
  getReviewTotal,
  mediaCategory,
} from '../utils/constants';
import { latestReviewWatchDate } from '../utils/reviewData';
import { useLanguage } from './LanguageContext';

export default function MobileReviewList({ reviews = [], featuredIds }) {
  const { lang, t } = useLanguage();
  const locale = lang === 'zh' ? 'zh-TW' : 'en-US';

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((review) => {
        const total = getReviewTotal(review);
        const badge = MEDIA_BADGES[mediaCategory(review)];
        const year = review.release_date
          ? new Date(review.release_date).getFullYear()
          : null;
        const latestWatch = latestReviewWatchDate(review);
        const featured = featuredIds?.has(review.id);

        return (
          <Link
            key={review.id}
            to={`/review/${review.id}`}
            state={{ review }}
            aria-label={`${t('readReview')}: ${review.title}`}
            className="group grid min-h-28 grid-cols-[72px_minmax(0,1fr)] gap-3 overflow-hidden rounded-2xl border border-[#1A1A1A]/12 bg-[#F5EFE1] p-2.5 pr-3 shadow-sm transition-transform active:scale-[0.99]"
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#1A1A1A]/8">
              {review.poster_path ? (
                <img
                  src={`${TMDB_IMG_BASE}w185${review.poster_path}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center px-1 text-center text-[10px] font-bold text-text-muted">
                  {t('notAvailable')}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-2 py-1">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <h3 className="line-clamp-2 min-w-0 text-base font-black leading-snug text-text-primary">
                  {review.title}
                </h3>
                {total != null && (
                  <span className="shrink-0 rounded-lg bg-[#1A1A1A] px-2 py-1 text-sm font-black tabular-nums text-[#FE494A]">
                    {total.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-bold text-text-muted">
                <span>{badge.icon} {badge[lang]}</span>
                <span aria-hidden="true">·</span>
                <span>{Number.isFinite(year) ? year : t('unknownYear')}</span>
                {featured && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#FE494A]">★ {t('featured')}</span>
                  </>
                )}
              </div>

              <p className="text-xs font-medium text-text-dim">
                {latestWatch
                  ? `${t('lastWatched')}: ${formatDate(latestWatch, locale)}`
                  : t('noWatchDate')}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
