export function hasReviewDetail(review) {
  if (!review || typeof review !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(review, 'review_text') ||
    Object.prototype.hasOwnProperty.call(review, 'season_reviews');
}

export function latestReviewWatchDate(review) {
  if (review?.last_watched_date) return String(review.last_watched_date);

  let dates = review?.watch_dates;
  if (typeof dates === 'string') {
    try {
      dates = JSON.parse(dates);
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(dates)) return undefined;

  return dates
    .map(String)
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0];
}
