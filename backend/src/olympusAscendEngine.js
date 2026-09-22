import { money, pickWeighted, secureFloat, validBet } from './slotMath.js';

export const OLYMPUS_ASCEND_CONFIG = {
  id: 'olympus-ascend', title: 'Olympus Ascend', rtp: 0.965, rows: 5, columns: 6, maxWin: 5000,
  symbols: [
    { key: 'laurel', label: 'Louro', glyph: '🌿', weight: 34, pays: 0.587 },
    { key: 'scroll', label: 'Pergaminho', glyph: '📜', weight: 28, pays: 0.978 },
    { key: 'shield', label: 'Escudo', glyph: '🛡️', weight: 20, pays: 2.054 },
    { key: 'owl', label: 'Coruja', glyph: '🦉', weight: 13, pays: 4.402 },
    { key: 'lightning', label: 'Raio', glyph: '⚡', weight: 5, pays: 13.695 }
  ]
};

const symbolMap = Object.fromEntries(OLYMPUS_ASCEND_CONFIG.symbols.map((symbol) => [symbol.key, symbol]));
const at = (row, column) => row * 6 + column;
const randomSymbol = () => pickWeighted(OLYMPUS_ASCEND_CONFIG.symbols);
const createGrid = () => Array.from({ length: 5 }, () => Array.from({ length: 6 }, randomSymbol));

const findClusters = (grid) => {
  const visited = new Set(); const hits = [];
  for (let row = 0; row < 5; row += 1) for (let column = 0; column < 6; column += 1) {
    const first = at(row, column); if (visited.has(first)) continue;
    const key = grid[row][column]; const queue = [[row, column]]; const positions = []; visited.add(first);
    while (queue.length) {
      const [r, c] = queue.shift(); positions.push(at(r, c));
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        const index = at(nr, nc);
        if (nr >= 0 && nr < 5 && nc >= 0 && nc < 6 && !visited.has(index) && grid[nr][nc] === key) {
          visited.add(index); queue.push([nr, nc]);
        }
      }
    }
    if (positions.length >= 8) hits.push({ symbol: key, positions, count: positions.length });
  }
  return hits;
};

const prizeMultiplier = () => {
  const roll = secureFloat();
  if (roll < 0.0002) return 500;
  if (roll < 0.001) return 100;
  if (roll < 0.008) return 50;
  if (roll < 0.04) return 20;
  if (roll < 0.16) return 10;
  if (roll < 0.48) return 5;
  return 2;
};

export class OlympusAscendEngine {
  spin(inputBet = 1) {
    const bet = validBet(inputBet);
    const grid = createGrid();
    const clusters = findClusters(grid);
    const baseWin = clusters.reduce((sum, hit) => sum + bet * symbolMap[hit.symbol].pays * (1 + (hit.count - 8) * 0.25), 0);
    const multiplier = clusters.length ? prizeMultiplier() : 1;
    return {
      ...OLYMPUS_ASCEND_CONFIG, betAmount: money(bet), grid, clusters,
      baseWin: money(baseWin), multiplier,
      winAmount: money(Math.min(baseWin * multiplier, bet * OLYMPUS_ASCEND_CONFIG.maxWin)),
      featureTriggered: clusters.length > 0 && multiplier > 1
    };
  }
}

export default OlympusAscendEngine;
