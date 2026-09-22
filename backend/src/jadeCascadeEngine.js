import { money, pickWeighted, validBet } from './slotMath.js';

// Original 4x4 tile game. Symbol weights and award table are proprietary.
export const JADE_CASCADE_CONFIG = {
  id: 'jade-cascade',
  title: 'Jade Cascade',
  rtp: 0.965,
  rows: 4,
  columns: 4,
  maxWin: 2500,
  symbols: [
    { key: 'bamboo', label: 'Bambu', glyph: '🎋', weight: 34, pays: 0.303 },
    { key: 'coin', label: 'Moeda', glyph: '🪙', weight: 28, pays: 0.472 },
    { key: 'fan', label: 'Leque', glyph: '🪭', weight: 21, pays: 0.809 },
    { key: 'jade', label: 'Jade', glyph: '🟢', weight: 12, pays: 1.937 },
    { key: 'dragon', label: 'Dragão', glyph: '🐉', weight: 5, pays: 6.402 }
  ]
};

const symbolMap = Object.fromEntries(JADE_CASCADE_CONFIG.symbols.map((symbol) => [symbol.key, symbol]));
const cell = (row, column) => row * JADE_CASCADE_CONFIG.columns + column;

const randomSymbol = () => pickWeighted(JADE_CASCADE_CONFIG.symbols);
const createGrid = () => Array.from({ length: JADE_CASCADE_CONFIG.rows }, () =>
  Array.from({ length: JADE_CASCADE_CONFIG.columns }, randomSymbol));

const findClusters = (grid) => {
  const seen = new Set();
  const clusters = [];
  for (let row = 0; row < 4; row += 1) for (let column = 0; column < 4; column += 1) {
    const start = cell(row, column);
    if (seen.has(start)) continue;
    const key = grid[row][column];
    const queue = [[row, column]];
    const group = [];
    seen.add(start);
    while (queue.length) {
      const [r, c] = queue.shift();
      group.push(cell(r, c));
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        const index = cell(nr, nc);
        if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4 && !seen.has(index) && grid[nr][nc] === key) {
          seen.add(index); queue.push([nr, nc]);
        }
      }
    }
    if (group.length >= 4) clusters.push({ symbol: key, positions: group, count: group.length });
  }
  return clusters;
};

const cascade = (grid, removed) => {
  const next = grid.map((row) => [...row]);
  for (let column = 0; column < 4; column += 1) {
    const survivors = [];
    for (let row = 3; row >= 0; row -= 1) if (!removed.has(cell(row, column))) survivors.push(next[row][column]);
    while (survivors.length < 4) survivors.push(randomSymbol());
    for (let row = 3, i = 0; row >= 0; row -= 1, i += 1) next[row][column] = survivors[i];
  }
  return next;
};

export class JadeCascadeEngine {
  spin(inputBet = 1) {
    const bet = validBet(inputBet);
    let grid = createGrid();
    let total = 0;
    const cascades = [];
    for (let round = 0; round < 20; round += 1) {
      const clusters = findClusters(grid);
      if (!clusters.length) break;
      const win = clusters.reduce((sum, hit) => sum + bet * symbolMap[hit.symbol].pays * (1 + (hit.count - 4) * 0.45), 0);
      total += win;
      const removed = new Set(clusters.flatMap((hit) => hit.positions));
      cascades.push({ grid, wins: clusters, win: money(win), removed: [...removed] });
      grid = cascade(grid, removed);
    }
    return {
      ...JADE_CASCADE_CONFIG,
      betAmount: money(bet), grid, cascades,
      winAmount: money(Math.min(total, bet * JADE_CASCADE_CONFIG.maxWin)),
      featureTriggered: cascades.length > 1
    };
  }
}

export default JadeCascadeEngine;
