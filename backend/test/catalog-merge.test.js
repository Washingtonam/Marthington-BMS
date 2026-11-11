import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeCatalogName,
  pickPreferredCatalogName,
  mergeCatalogValues,
  findCatalogMatch,
  findSimilarCatalogGroups
} from '../src/modules/catalog/catalogUtils.js';

test('normalizeCatalogName collapses spacing and punctuation', () => {
  assert.equal(normalizeCatalogName('  Blue  Tooth Mouse  '), 'blue tooth mouse');
  assert.equal(normalizeCatalogName('Dell-Laptop 15"'), 'dell laptop 15');
});

test('mergeCatalogValues prefers the more descriptive name and sums stock', () => {
  const merged = mergeCatalogValues(
    { name: 'Dell Laptop', stock: 8, price: 500000, costPrice: 410000 },
    { name: 'Dell Laptop 15 Inch', stock: 3, price: 550000, costPrice: 420000 }
  );

  assert.equal(merged.name, 'Dell Laptop 15 Inch');
  assert.equal(merged.stock, 11);
  assert.equal(merged.price, 550000);
  assert.equal(merged.costPrice, 410000);
  assert.equal(pickPreferredCatalogName('Dell Laptop', 'Dell Laptop 15 Inch'), 'Dell Laptop 15 Inch');
});

test('findCatalogMatch only matches normalized exact names', () => {
  const products = [
    { _id: '1', name: 'Dell Laptop' },
    { _id: '2', name: 'Dell Laptop 15 Inch' }
  ];

  assert.equal(findCatalogMatch(products, 'dell-laptop')?._id, '1');
  assert.equal(findCatalogMatch(products, 'Dell Laptop 15'), null);
});

test('findSimilarCatalogGroups reports normalized duplicates and likely typos', () => {
  const result = findSimilarCatalogGroups([
    { _id: '1', name: 'Blue Tooth Mouse' },
    { _id: '2', name: 'blue-tooth mouse' },
    { _id: '3', name: 'Blue Tooth Mousse' },
    { _id: '4', name: 'Desk' }
  ]);

  assert.equal(result.groups.some((group) => group.type === 'duplicate' && group.products.length === 2), true);
  assert.equal(result.groups.some((group) => group.type === 'similar' && group.products.length === 2), true);
  assert.equal(result.truncated, false);
});
