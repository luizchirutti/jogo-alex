export const SYMBOLS = {
  orange: { key: 'orange', emoji: '🍊', payout: 1.5 },
  fire: { key: 'fire', emoji: '🧨', payout: 2.5 },
  envelope: { key: 'envelope', emoji: '✉️', payout: 3.5 },
  coins: { key: 'coins', emoji: '💰', payout: 5.5 },
  jade: { key: 'jade', emoji: '🗿', payout: 7.5 },
  gold: { key: 'gold', emoji: '🥇', payout: 10.5 },
  wild: { key: 'wild', emoji: '🐯', payout: 18 }
};

export const PAYLINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 4, 8],
  [2, 4, 6]
];

export class FortuneTigerEngine {
  constructor({ betAmount = 1, rng = Math.random } = {}) {
    this.betAmount = Number.isFinite(Number(betAmount)) && Number(betAmount) > 0 ? Number(betAmount) : 1;
    this.rng = typeof rng === 'function' ? rng : Math.random;
  }

  getSymbolPool() {
    return ['orange', 'fire', 'envelope', 'coins', 'jade', 'gold', 'wild'];
  }

  getSymbolByKey(key) {
    return SYMBOLS[key] || SYMBOLS.orange;
  }

  randomBaseSymbol() {
    const pool = this.getSymbolPool();
    const weighted = [
      'orange', 'orange', 'orange',
      'fire', 'fire',
      'envelope', 'envelope',
      'coins', 'coins',
      'jade',
      'gold',
      'wild'
    ];

    return weighted[Math.floor(this.rng() * weighted.length)] ?? 'orange';
  }

  getTargetSymbol() {
    const nonWild = ['orange', 'fire', 'envelope', 'coins', 'jade', 'gold'];
    return nonWild[Math.floor(this.rng() * nonWild.length)] ?? 'orange';
  }

  triggerFeature() {
    const triggered = this.rng() <= 0.18;

    if (!triggered) {
      return { active: false, targetSymbol: null };
    }

    return {
      active: true,
      targetSymbol: this.getTargetSymbol()
    };
  }

  resolveLine(lineCells) {
    const nonWild = lineCells.filter((cell) => cell && cell !== 'wild');
    const wildCount = lineCells.filter((cell) => cell === 'wild').length;

    if (nonWild.length === 0) {
      return { symbol: 'wild', count: 3, wildCount };
    }

    const counts = {};
    for (const symbol of nonWild) {
      counts[symbol] = (counts[symbol] || 0) + 1;
    }

    const dominantSymbol = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!dominantSymbol) {
      return { symbol: 'wild', count: 0, wildCount };
    }

    return {
      symbol: dominantSymbol[0],
      count: dominantSymbol[1] + wildCount,
      wildCount
    };
  }

  isFullScreen(grid) {
    const nonBlank = grid.filter((cell) => cell && cell !== 'blank');
    if (nonBlank.length !== 9) {
      return false;
    }

    const counts = {};
    for (const symbol of grid) {
      counts[symbol] = (counts[symbol] || 0) + 1;
    }

    const entries = Object.entries(counts);
    if (entries.length === 1) {
      return true;
    }

    if (entries.length === 2) {
      const main = entries.find(([symbol]) => symbol !== 'wild');
      const wildCount = counts.wild || 0;
      return !!main && wildCount + (main[1] || 0) === 9;
    }

    return false;
  }

  calculateWin(grid, betAmount = this.betAmount) {
    const normalizedGrid = Array.isArray(grid) ? [...grid] : [];
    const stake = Number.isFinite(Number(betAmount)) && Number(betAmount) > 0 ? Number(betAmount) : this.betAmount;
    let totalWin = 0;
    const lines = [];

    for (const positions of PAYLINES) {
      const row = positions.map((index) => normalizedGrid[index] || 'blank');
      const resolved = this.resolveLine(row);
      const symbol = resolved.symbol;
      const count = resolved.count;

      if (count >= 3 && symbol && symbol !== 'blank') {
        const multiplier = this.getSymbolByKey(symbol).payout;
        const lineWin = stake * multiplier * (count >= 4 ? 1.5 : 1);
        totalWin += lineWin;
        lines.push({
          positions,
          symbol,
          count,
          lineWin: Number(lineWin.toFixed(2))
        });
      }
    }

    const fullScreen = this.isFullScreen(normalizedGrid);
    if (fullScreen) {
      totalWin *= 10;
    }

    return {
      winAmount: Number(totalWin.toFixed(2)),
      fullScreen,
      multiplier: fullScreen ? 10 : 1,
      lines,
      hasWin: totalWin > 0
    };
  }

  buildFeatureGrid(feature) {
    if (!feature?.active || !feature.targetSymbol) {
      return Array.from({ length: 9 }, () => this.randomBaseSymbol());
    }

    const target = feature.targetSymbol;
    const grid = Array.from({ length: 9 }, () => null);
    const stickyPositions = new Set();

    for (let loop = 0; loop < 8; loop += 1) {
      const nextGrid = grid.map((cell, index) => {
        if (stickyPositions.has(index)) {
          return cell;
        }

        const roll = this.rng();
        if (roll < 0.42) return target;
        if (roll < 0.56) return 'wild';
        return null;
      });

      const landed = nextGrid.reduce((acc, cell, index) => {
        if ((cell === target || cell === 'wild') && !stickyPositions.has(index)) {
          acc.push(index);
        }
        return acc;
      }, []);

      if (landed.length === 0) {
        break;
      }

      landed.slice(0, 3).forEach((index) => stickyPositions.add(index));
      for (let index = 0; index < nextGrid.length; index += 1) {
        if (stickyPositions.has(index)) {
          grid[index] = nextGrid[index];
        }
      }

      if (stickyPositions.size >= 9) {
        break;
      }
    }

    for (let index = 0; index < grid.length; index += 1) {
      if (!grid[index]) {
        grid[index] = this.randomBaseSymbol();
      }
    }

    return grid;
  }

  spin({ betAmount = this.betAmount } = {}) {
    const stake = Number.isFinite(Number(betAmount)) && Number(betAmount) > 0 ? Number(betAmount) : this.betAmount;
    const feature = this.triggerFeature();
    const grid = feature.active ? this.buildFeatureGrid(feature) : Array.from({ length: 9 }, () => this.randomBaseSymbol());
    const win = this.calculateWin(grid, stake);

    const result = {
      grid,
      symbols: grid.map((symbol) => this.getSymbolByKey(symbol).emoji),
      betAmount: stake,
      featureTriggered: feature.active,
      targetSymbol: feature.active ? feature.targetSymbol : null,
      winAmount: win.winAmount,
      multiplier: win.multiplier,
      fullScreen: win.fullScreen,
      lines: win.lines,
      isWin: win.hasWin,
      timestamp: new Date().toISOString()
    };

    return result;
  }
}

export default FortuneTigerEngine;
