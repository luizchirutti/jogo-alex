import { money, pickWeighted, secureFloat, validBet } from './slotMath.js';

export const FESTIVAL_GAMES = {
  'crimson-tiger': {
    id: 'crimson-tiger', title: 'Crimson Tiger Festival', rows: 3, columns: 3, rtp: 0.965,
    feature: 'Fúria Escarlate', featureChance: 0.035, featureMultiplier: 3, payoutScale: 0.728,
    symbols: [
      { key: 'citrus', glyph: '🍊', weight: 31, pays: 0.35 }, { key: 'ribbon', glyph: '🎀', weight: 25, pays: 0.55 },
      { key: 'firework', glyph: '🧨', weight: 19, pays: 0.9 }, { key: 'ingot', glyph: '🛶', weight: 16, pays: 1.7 }, { key: 'tiger', glyph: '🐯', weight: 9, pays: 4.5 }
    ]
  },
  'golden-horn': {
    id: 'golden-horn', title: 'Golden Horn Vault', rows: 3, columns: 4, rtp: 0.965,
    feature: 'Investida Dourada', featureChance: 0.025, featureMultiplier: 10, payoutScale: 0.4,
    symbols: [
      { key: 'crate', glyph: '📦', weight: 31, pays: 0.28 }, { key: 'rocket', glyph: '🚀', weight: 25, pays: 0.5 },
      { key: 'fengcoin', glyph: '🪙', weight: 20, pays: 0.85 }, { key: 'ingot', glyph: '🛶', weight: 16, pays: 1.55 }, { key: 'bull', glyph: '🐂', weight: 8, pays: 4.1 }
    ]
  },
  'imperial-mouse': {
    id: 'imperial-mouse', title: 'Imperial Mouse Parade', rows: 3, columns: 3, rtp: 0.965,
    feature: 'Fila Imperial', featureChance: 0.045, featureMultiplier: 4, payoutScale: 0.695,
    symbols: [
      { key: 'peanut', glyph: '🥜', weight: 31, pays: 0.35 }, { key: 'citrus', glyph: '🍊', weight: 25, pays: 0.55 },
      { key: 'firework', glyph: '🧨', weight: 19, pays: 0.9 }, { key: 'bag', glyph: '💰', weight: 16, pays: 1.65 }, { key: 'mouse', glyph: '🐭', weight: 9, pays: 4.4 }
    ]
  },
  'neon-hare': {
    id: 'neon-hare', title: 'Neon Hare Rush', rows: 3, columns: 4, rtp: 0.965,
    feature: 'Corrida Lunar', featureChance: 0.04, featureMultiplier: 5, payoutScale: 0.399,
    symbols: [
      { key: 'carrot', glyph: '🥕', weight: 31, pays: 0.3 }, { key: 'digitalenvelope', glyph: '✉️', weight: 25, pays: 0.52 },
      { key: 'knot', glyph: '🪢', weight: 19, pays: 0.85 }, { key: 'chip', glyph: '💳', weight: 16, pays: 1.6 }, { key: 'hare', glyph: '🐰', weight: 9, pays: 4.3 }
    ]
  },
  'jade-sky-dragon': {
    id: 'jade-sky-dragon', title: 'Jade Sky Dragon', rows: 3, columns: 3, rtp: 0.965,
    feature: 'Orbe Celeste', featureChance: 0.06, featureMultiplier: 2, payoutScale: 0.701,
    symbols: [
      { key: 'knot', glyph: '🪢', weight: 30, pays: 0.36 }, { key: 'lantern', glyph: '🏮', weight: 25, pays: 0.58 },
      { key: 'coin', glyph: '🪙', weight: 20, pays: 0.95 }, { key: 'ingot', glyph: '🛶', weight: 16, pays: 1.75 }, { key: 'dragon', glyph: '🐲', weight: 9, pays: 4.6 }
    ]
  }
};

export class FestivalEngine {
  constructor(config) { this.config = config; this.symbols = Object.fromEntries(config.symbols.map((symbol) => [symbol.key, symbol])); }

  spin(inputBet) {
    const bet = validBet(inputBet);
    const grid = Array.from({ length: this.config.rows }, () => Array.from({ length: this.config.columns }, () => pickWeighted(this.config.symbols)));
    const counts = grid.flat().reduce((total, key) => ({ ...total, [key]: (total[key] || 0) + 1 }), {});
    const hits = Object.entries(counts).filter(([, count]) => count >= 3).map(([symbol, count]) => ({ symbol, count, positions: grid.flatMap((row, r) => row.map((key, c) => key === symbol ? r * this.config.columns + c : -1).filter((pos) => pos >= 0)) }));
    const baseWin = hits.reduce((sum, hit) => sum + bet * this.symbols[hit.symbol].pays * (1 + (hit.count - 3) * 0.3), 0) * this.config.payoutScale;
    const featureTriggered = secureFloat() < this.config.featureChance && baseWin > 0;
    const multiplier = featureTriggered ? this.config.featureMultiplier : 1;
    return { ...this.config, betAmount: money(bet), grid, hits, baseWin: money(baseWin), multiplier, featureTriggered, winAmount: money(Math.min(baseWin * multiplier, bet * 2500)) };
  }
}
