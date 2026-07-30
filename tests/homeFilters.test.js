import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_GENRE_OPTIONS,
  HOME_MEDIA_OPTIONS,
  selectedFilterLabel,
} from '../src/utils/homeFilters.js';

const translate = (key) => ({
  All: '全部類型',
  filterAllShort: '全部',
  Action: '動作',
  mediaMovie: '電影',
}[key] || key);

test('filter summaries use short all label and selected values', () => {
  assert.equal(selectedFilterLabel(HOME_GENRE_OPTIONS, '', translate, true), '全部');
  assert.equal(selectedFilterLabel(HOME_GENRE_OPTIONS, '動作', translate, true), '動作');
  assert.equal(selectedFilterLabel(HOME_MEDIA_OPTIONS, 'movie', translate, true), '電影');
});

test('unknown filter values fall back to the all option', () => {
  assert.equal(selectedFilterLabel(HOME_MEDIA_OPTIONS, 'invalid', translate, true), '全部');
});
