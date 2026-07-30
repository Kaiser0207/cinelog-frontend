import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHomeViewMode } from '../src/utils/homeViewMode.js';

test('home view keeps only shelf and deck preferences', () => {
  assert.equal(normalizeHomeViewMode('shelf'), 'shelf');
  assert.equal(normalizeHomeViewMode('deck'), 'deck');
});

test('legacy and unknown home views return to the shelf', () => {
  for (const value of ['compact', 'grid', 'list', '', null, undefined]) {
    assert.equal(normalizeHomeViewMode(value), 'shelf');
  }
});
