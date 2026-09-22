import test from 'node:test';
import assert from 'node:assert/strict';
import { JadeCascadeEngine } from '../src/jadeCascadeEngine.js';
import { OlympusAscendEngine } from '../src/olympusAscendEngine.js';

test('Jade Cascade returns a 4x4 grid and its cascade history', () => {
  const result = new JadeCascadeEngine().spin(5);
  assert.equal(result.grid.length, 4); assert.ok(result.grid.every((row) => row.length === 4));
  assert.equal(result.rtp, 0.965); assert.ok(result.winAmount >= 0);
});

test('Olympus Ascend returns a 6x5 cluster board and permitted multiplier', () => {
  const result = new OlympusAscendEngine().spin(5);
  assert.equal(result.grid.length, 5); assert.ok(result.grid.every((row) => row.length === 6));
  assert.ok([1, 2, 5, 10, 20, 50, 100, 500].includes(result.multiplier));
  assert.equal(result.rtp, 0.965);
});
