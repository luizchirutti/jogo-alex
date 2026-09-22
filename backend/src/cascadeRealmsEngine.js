import { money, pickWeighted, secureFloat, validBet } from './slotMath.js';

export const CASCADE_REALMS = {
  'jade-crown': { id: 'jade-crown', title: 'Jade Crown Mahjong', rows: 4, columns: 5, rtp: 0.965, feature: 'Portal de Jade', featureChance: 0.035, maxMultiplier: 10, payoutScale: 0.58, palette: 'jade', symbols: [
    { key: 'bamboo', glyph: '🎋', weight: 33, pays: 0.18 }, { key: 'circle', glyph: '⭕', weight: 27, pays: 0.28 }, { key: 'character', glyph: '㊙️', weight: 20, pays: 0.47 }, { key: 'goldtile', glyph: '🀄', weight: 13, pays: 1.1 }, { key: 'jadephoenix', glyph: '🦚', weight: 7, pays: 3.2 }
  ] },
  'ember-dragon-vault': { id: 'ember-dragon-vault', title: 'Ember Dragon Vault', rows: 5, columns: 5, rtp: 0.965, feature: 'Rainha da Brasa', featureChance: 0.03, maxMultiplier: 8, payoutScale: 0.334, palette: 'ember', symbols: [
    { key: 'ruby', glyph: '🔴', weight: 33, pays: 0.16 }, { key: 'sapphire', glyph: '🔵', weight: 27, pays: 0.27 }, { key: 'shield', glyph: '🛡️', weight: 20, pays: 0.48 }, { key: 'egg', glyph: '🥚', weight: 13, pays: 1.15 }, { key: 'dragon', glyph: '🐉', weight: 7, pays: 3.4 }
  ] },
  'qilin-skyfall': { id: 'qilin-skyfall', title: 'Qilin Skyfall', rows: 6, columns: 6, rtp: 0.965, feature: 'Raio do Qilin', featureChance: 0.04, maxMultiplier: 9, payoutScale: 0.161, palette: 'sky', symbols: [
    { key: 'lotus', glyph: '🪷', weight: 33, pays: 0.14 }, { key: 'koi', glyph: '🐟', weight: 27, pays: 0.24 }, { key: 'frog', glyph: '🐸', weight: 20, pays: 0.42 }, { key: 'boat', glyph: '⛵', weight: 13, pays: 1.05 }, { key: 'qilin', glyph: '🦄', weight: 7, pays: 3.1 }
  ] },
  'caishen-horizon': { id: 'caishen-horizon', title: 'Caishen Horizon', rows: 6, columns: 6, rtp: 0.965, feature: 'Leque da Fortuna', featureChance: 0.028, maxMultiplier: 12, payoutScale: 0.144, palette: 'gold', symbols: [
    { key: 'tree', glyph: '🌳', weight: 33, pays: 0.14 }, { key: 'drum', glyph: '🥁', weight: 27, pays: 0.25 }, { key: 'envelope', glyph: '✉️', weight: 20, pays: 0.45 }, { key: 'ingot', glyph: '🛶', weight: 13, pays: 1.08 }, { key: 'fortune', glyph: '🧧', weight: 7, pays: 3.25 }
  ] }
};

const clusterPositions = (grid) => {
  const rows = grid.length; const columns = grid[0].length; const seen = new Set(); const hits = [];
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const initial = row * columns + column; if (seen.has(initial)) continue;
    const key = grid[row][column]; const queue = [[row, column]]; const positions = []; seen.add(initial);
    while (queue.length) {
      const [r, c] = queue.shift(); positions.push(r * columns + c);
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        const index = nr * columns + nc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < columns && !seen.has(index) && grid[nr][nc] === key) { seen.add(index); queue.push([nr, nc]); }
      }
    }
    if (positions.length >= 4) hits.push({ symbol: key, count: positions.length, positions });
  }
  return hits;
};

export class CascadeRealmEngine {
  constructor(config) { this.config = config; this.symbols = Object.fromEntries(config.symbols.map((symbol) => [symbol.key, symbol])); }
  randomSymbol = () => pickWeighted(this.config.symbols);
  buildGrid = () => Array.from({ length: this.config.rows }, () => Array.from({ length: this.config.columns }, this.randomSymbol));
  cascade(grid, removed) {
    const next = grid.map((row) => [...row]);
    for (let column = 0; column < this.config.columns; column += 1) {
      const survivors = [];
      for (let row = this.config.rows - 1; row >= 0; row -= 1) if (!removed.has(row * this.config.columns + column)) survivors.push(next[row][column]);
      while (survivors.length < this.config.rows) survivors.push(this.randomSymbol());
      for (let row = this.config.rows - 1, i = 0; row >= 0; row -= 1, i += 1) next[row][column] = survivors[i];
    }
    return next;
  }
  spin(inputBet) {
    const bet = validBet(inputBet); let grid = this.buildGrid(); let total = 0; const cascades = []; let collected = 0;
    for (let step = 0; step < 15; step += 1) {
      const hits = clusterPositions(grid); if (!hits.length) break;
      const multiplier = Math.min(this.config.maxMultiplier, [1, 2, 3, 5, 7, 10, 12][step] || this.config.maxMultiplier);
      const base = hits.reduce((sum, hit) => sum + bet * this.symbols[hit.symbol].pays * (1 + (hit.count - 4) * 0.32), 0) * this.config.payoutScale;
      const removed = new Set(hits.flatMap((hit) => hit.positions)); collected += removed.size; total += base * multiplier;
      cascades.push({ grid, hits, removed: [...removed], multiplier, win: money(base * multiplier) }); grid = this.cascade(grid, removed);
    }
    const featureTriggered = cascades.length > 0 && secureFloat() < this.config.featureChance;
    if (featureTriggered) total *= 2;
    return { ...this.config, betAmount: money(bet), grid, cascades, collected, multiplier: cascades.at(-1)?.multiplier || 1, featureTriggered, winAmount: money(Math.min(total, bet * 3000)) };
  }
}
