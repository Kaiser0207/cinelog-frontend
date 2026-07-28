import test from 'node:test';
import assert from 'node:assert/strict';
import { hasReviewDetail } from '../src/utils/reviewData.js';
import { absoluteSiteUrl, compactDescription } from '../src/utils/seo.js';
import { flattenReview, getReviewTotal } from '../src/utils/constants.js';
import { matchesViewingPeriod, parseReviewGenres, parseWatchDates } from '../src/utils/statsData.js';

test('summary rows are not treated as complete detail payloads', () => {
  assert.equal(hasReviewDetail({ id: 1, title: 'Summary' }), false);
  assert.equal(hasReviewDetail({ id: 1, review_text: null }), true);
  assert.equal(hasReviewDetail({ id: 2, season_reviews: [] }), true);
});

test('SEO helpers normalize URLs and compact whitespace', () => {
  assert.equal(
    absoluteSiteUrl('/review/42'),
    'https://cinerooms.vercel.app/review/42',
  );
  assert.equal(compactDescription('  A\n\n film   review  '), 'A film review');
  assert.equal(compactDescription('abcdefghij', 7), 'abcdef…');
});

test('nested summary rows retain catalogue fields and their backend score', () => {
  const review = flattenReview({
    id: 42,
    total_score: 8.6,
    last_watched_date: '2026-07-20',
    movie: {
      tmdb_id: 550,
      title: 'Fight Club',
      media_type: 'movie',
      release_date: '1999-10-15',
    },
  });

  assert.equal(review.title, 'Fight Club');
  assert.equal(review.media_type, 'movie');
  assert.equal(review.last_watched_date, '2026-07-20');
  assert.equal(getReviewTotal(review), 8.6);
});

test('series summary prefers its manual overall score', () => {
  assert.equal(getReviewTotal({
    media_type: 'tv',
    overall_score: 9.1,
    total_score: 8.8,
  }), 9.1);
});

test('statistics read dates and genres from the full review shape', () => {
  const review = {
    watch_dates: '["2025-12-30", "2026-01-03"]',
    genres: ['Drama', 'Mystery'],
  };

  assert.deepEqual(parseWatchDates(review), ['2025-12-30', '2026-01-03']);
  assert.deepEqual(parseReviewGenres(review), ['Drama', 'Mystery']);
  assert.equal(matchesViewingPeriod('2026-01-03', '2026', '01'), true);
  assert.equal(matchesViewingPeriod('2025-12-30', '2026', 'all'), false);
});
