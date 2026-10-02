import test from 'node:test';
import assert from 'node:assert/strict';

import User from '../src/modules/users/user.model.js';

test('user schema exposes affiliate payout bank fields', () => {
  assert.ok(User.schema.path('bankName'));
  assert.ok(User.schema.path('accountName'));
  assert.ok(User.schema.path('accountNumber'));
  assert.ok(User.schema.path('phoneNumber'));
  assert.ok(User.schema.path('address'));
});
