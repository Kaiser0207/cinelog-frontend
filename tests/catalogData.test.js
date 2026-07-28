import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogNumberMap, extractCatalogRows } from '../src/utils/catalogData.js';

test('extractCatalogRows accepts the deployed items envelope', () => {
  const items = [{ id: 9, catalog_number: 3 }];
  assert.equal(extractCatalogRows({ items, total: 1 }), items);
});

test('catalog uses explicit backend numbers when complete', () => {
  const result = buildCatalogNumberMap({
    items: [
      { id: 8, created_at: '2026-01-02', catalog_number: 2 },
      { id: 3, created_at: '2026-01-01', catalog_number: 1 },
    ],
  });
  assert.equal(result.get(8), 2);
  assert.equal(result.get(3), 1);
});

test('catalog derives stable acquisition order for legacy responses', () => {
  const result = buildCatalogNumberMap({
    reviews: [
      { id: 20, created_at: '2026-02-02' },
      { id: 10, created_at: '2026-01-01' },
    ],
  });
  assert.deepEqual([...result.entries()], [[10, 1], [20, 2]]);
});
