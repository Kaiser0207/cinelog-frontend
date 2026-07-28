export function hasReviewDetail(review) {
  if (!review || typeof review !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(review, 'review_text') ||
    Object.prototype.hasOwnProperty.call(review, 'season_reviews');
}
