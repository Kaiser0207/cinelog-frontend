import test from 'node:test';
import assert from 'node:assert/strict';
import { hasReviewDetail, latestReviewWatchDate } from '../src/utils/reviewData.js';
import { absoluteSiteUrl, compactDescription } from '../src/utils/seo.js';
import {
  computeCinematic,
  computeEntertainment,
  computeTotal,
  flattenReview,
  getReviewTotal,
  SCORE_STEP,
} from '../src/utils/constants.js';
import { matchesViewingPeriod, parseReviewGenres, parseWatchDates } from '../src/utils/statsData.js';

test('score editing and calculations use one-decimal precision', () => {
  assert.equal(SCORE_STEP, 0.1);
  assert.equal(computeEntertainment(8.2, 8.4), 8.3);
  assert.equal(computeCinematic(8.1, 8.2, 8.3, 8.4), 8.3);
  assert.equal(computeTotal(8.3, 8.3), 8.3);
});

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

test('latest watch date prefers the summary field then newest history date', () => {
  assert.equal(latestReviewWatchDate({
    last_watched_date: '2026-07-30',
    watch_dates: ['2026-07-31'],
  }), '2026-07-30');
  assert.equal(latestReviewWatchDate({
    watch_dates: '["2025-01-02", "2026-06-03"]',
  }), '2026-06-03');
  assert.equal(latestReviewWatchDate({
    watch_dates: ['2026-02-01', '2026-07-01'],
  }), '2026-07-01');
  assert.equal(latestReviewWatchDate({ watch_dates: 'bad json' }), undefined);
});
