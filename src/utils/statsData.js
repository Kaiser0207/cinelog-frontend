export function parseWatchDates(review) {
  if (typeof review?.watch_dates === 'string') {
    try {
      const parsed = JSON.parse(review.watch_dates);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(review?.watch_dates) ? review.watch_dates : [];
}

export function parseReviewGenres(review) {
  if (typeof review?.genres === 'string') {
    try {
      const parsed = JSON.parse(review.genres);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(review?.genres) ? review.genres : [];
}

export function matchesViewingPeriod(date, year, month) {
  const value = String(date);
  if (year !== 'all' && !value.startsWith(year)) return false;
  return month === 'all' || value.slice(5, 7) === month;
}
