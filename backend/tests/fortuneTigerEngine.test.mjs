import test from 'node:test';
import assert from 'node:assert/strict';

import { FortuneTigerEngine } from '../src/fortuneTigerEngine.js';

test('spin returns 3x3 reels, positive win and bounded multiplier', () => {
  const engine = new FortuneTigerEngine({ bet: 1, balance: 1000 });
  const result = engine.spin(1);

  assert.equal(result.reels.length, 3);
  assert.equal(result.reels[0].length, 3);
  assert.ok(Number.isFinite(result.win));
  assert.ok(result.win >= 0);
  assert.ok(result.multiplier >= 1 && result.multiplier <= 10);
  assert.ok(Number.isFinite(result.balance));
  assert.ok(result.balance >= 0);
});

test('win is capped at 2500x of the bet', () => {
  const engine = new FortuneTigerEngine({ bet: 5, balance: 10000 });
  const result = engine.spin(5);

  assert.ok(result.win <= 5 * 2500);
});
