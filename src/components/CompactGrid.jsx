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


export default function CompactGrid({ reviews = [], featuredIds }) {
  const { lang, t } = useLanguage();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {reviews.map((review) => {
        const total = getReviewTotal(review);
        const badge = MEDIA_BADGES[mediaCategory(review)];
        const year = review.release_date
          ? new Date(review.release_date).getFullYear()
          : null;
        const latestWatch = latestReviewWatchDate(review);

        return (
          <Link
            key={review.id}
            to={`/review/${review.id}`}
            state={{ review }}
            aria-label={`${t('readReview')}: ${review.title}`}
            className="group min-w-0 overflow-hidden rounded-2xl border border-[#1A1A1A]/12 bg-[#F5EFE1] shadow-sm transition-transform hover:-translate-y-1 focus-visible:-translate-y-1"
          >
            <div className="relative aspect-[2/3] overflow-hidden bg-[#1A1A1A]/8">
              {review.poster_path ? (
                <img
                  src={`${TMDB_IMG_BASE}w342${review.poster_path}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="grid h-full place-items-center px-3 text-center text-sm font-bold text-text-muted">
                  {t('notAvailable')}
                </div>
              )}
              {total != null && (
                <span className="absolute right-2 top-2 rounded-lg bg-[#1A1A1A]/90 px-2 py-1 text-sm font-black tabular-nums text-[#FE494A]">
                  {total.toFixed(1)}
                </span>
              )}
              {featuredIds?.has(review.id) && (
                <span className="absolute left-2 top-2 rounded-lg bg-[#FE494A] px-2 py-1 text-xs font-black text-[#1A1A1A]">
                  ★ {t('featured')}
                </span>
              )}
            </div>

            <div className="space-y-2 p-3">
              <h3 className="line-clamp-2 text-sm font-black leading-snug text-text-primary">
                {review.title}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-text-muted">
                <span>{badge.icon} {badge[lang]}</span>
                <span aria-hidden="true">·</span>
                <span>{Number.isFinite(year) ? year : t('unknownYear')}</span>
              </div>
              <p className="text-xs text-text-dim">
                {latestWatch
                  ? `${t('lastWatched')}: ${formatDate(latestWatch, lang === 'zh' ? 'zh-TW' : 'en-US')}`
                  : t('noWatchDate')}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
