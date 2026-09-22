import crypto from 'node:crypto';

export const SYMBOLS = {
  coin: { key: 'coin', emoji: '🪙', weight: 30, payout: 1.2 },
  lantern: { key: 'lantern', emoji: '🏮', weight: 25, payout: 1.8 },
  red: { key: 'red', emoji: '🔴', weight: 20, payout: 2.5 },
  jade: { key: 'jade', emoji: '💎', weight: 17, payout: 3.4 },
  gold: { key: 'gold', emoji: '🥇', weight: 14, payout: 5.2 },
  tiger: { key: 'tiger', emoji: '🐯', weight: 12, payout: 9.5, special: true },
  bonus: { key: 'bonus', emoji: '✨', weight: 8, payout: 12 }
};

export const REEL_WEIGHTS = [
  { coin: 32, lantern: 27, red: 22, jade: 18, gold: 13, tiger: 12, bonus: 8 },
  { coin: 30, lantern: 26, red: 23, jade: 17, gold: 15, tiger: 11, bonus: 9 },
  { coin: 28, lantern: 24, red: 22, jade: 19, gold: 16, tiger: 10, bonus: 11 }
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const randomFloat = () => {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] / 4294967296;
};

const buildPool = (weights) => {
  const pool = [];
  for (const [symbol, weight] of Object.entries(weights)) {
    for (let i = 0; i < weight; i += 1) {
      pool.push(symbol);
    }
  }
  return pool;
};

const pickWeightedSymbol = (weights) => {
  const pool = buildPool(weights);
  const idx = Math.floor(randomFloat() * pool.length);
  return pool[idx] || 'coin';
};

const winningLines = [
  [0, 0, 0],
  [1, 1, 1],
  [2, 2, 2],
  [0, 1, 2],
  [2, 1, 0]
];

const symbolCount = (items) => {
  const counts = new Map();
  for (const symbol of items) {
    counts.set(symbol, (counts.get(symbol) || 0) + 1);
  }
  return counts;
};

const lineScore = (line, bet) => {
  const counts = symbolCount(line);
  const tigerCount = counts.get('tiger') || 0;
  const nonTiger = [...counts.entries()].filter(([symbol]) => symbol !== 'tiger');

  if (nonTiger.length === 0) {
    return { symbol: 'tiger', score: bet * SYMBOLS.tiger.payout * 1.5 };
  }

  const winner = nonTiger.sort((a, b) => b[1] - a[1])[0];
  const winningSymbol = winner?.[0] || 'coin';
  const totalMatching = (winner?.[1] || 0) + tigerCount;

  if (totalMatching < 3) {
    return null;
  }

  const payout = SYMBOLS[winningSymbol]?.payout || 1;
  return { symbol: winningSymbol, score: bet * payout * (1 + Math.max(0, totalMatching - 3) * 0.7) };
};

const evaluateReels = (reels, bet) => {
  let total = 0;
  const hits = [];

  for (const positions of winningLines) {
    const line = positions.map((rowIndex, columnIndex) => reels[columnIndex][rowIndex]);
    const result = lineScore(line, bet);
    if (!result) continue;
    total += result.score;
    hits.push(result.symbol);
  }

  return { total: Number(total.toFixed(2)), hits };
};

const hasTigerSymbol = (reels) => reels.some((reel) => reel.includes('tiger'));

const respinReels = (reels, multiplier = 1) => {
  let board = reels.map((reel) => [...reel]);
  let currentMultiplier = multiplier;
  const locked = new Set();

  for (let spin = 0; spin < 8; spin += 1) {
    if (!hasTigerSymbol(board)) break;

    for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) {
      const hasTigerOnReel = board[reelIndex].includes('tiger');
      if (hasTigerOnReel) {
        locked.add(reelIndex);
      }
    }

    const tigerHitCount = Array.from(locked).reduce((sum, reelIndex) => sum + board[reelIndex].filter((cell) => cell === 'tiger').length, 0);
    currentMultiplier = clamp(currentMultiplier + tigerHitCount, 1, 10);

    for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) {
      if (locked.has(reelIndex)) continue;
      board[reelIndex] = Array.from({ length: 3 }, () => pickWeightedSymbol(REEL_WEIGHTS[reelIndex]));
    }

    if (!hasTigerSymbol(board)) break;
  }

  return { board, multiplier: currentMultiplier };
};

export class FortuneTigerEngine {
  constructor({ bet = 1, balance = 1000 } = {}) {
    this.bet = Number.isFinite(Number(bet)) && Number(bet) > 0 ? Number(bet) : 1;
    this.balance = Number.isFinite(Number(balance)) && Number(balance) >= 0 ? Number(balance) : 1000;
  }

  generateReels() {
    return Array.from({ length: 3 }, (_, reelIndex) =>
      Array.from({ length: 3 }, () => pickWeightedSymbol(REEL_WEIGHTS[reelIndex]))
    );
  }

  spin(inputBet = this.bet, inputBalance = this.balance) {
    const bet = Number.isFinite(Number(inputBet)) && Number(inputBet) > 0 ? Number(inputBet) : this.bet;
    const balance = Number.isFinite(Number(inputBalance)) && Number(inputBalance) >= 0 ? Number(inputBalance) : this.balance;

    let reels = this.generateReels();
    let multiplier = 1;

    if (hasTigerSymbol(reels)) {
      const respin = respinReels(reels, multiplier);
      reels = respin.board;
      multiplier = respin.multiplier;
    }

    const evaluation = evaluateReels(reels, bet);
    const rawWin = evaluation.total * multiplier;
    const win = clamp(rawWin, 0, bet * 2500);
    const nextBalance = Math.max(0, balance - bet + win);

    return {
      reels,
      win: Number(win.toFixed(2)),
      multiplier,
      balance: Number(nextBalance.toFixed(2)),
      bet: Number(bet.toFixed(2))
    };
  }
}

export default FortuneTigerEngine;
