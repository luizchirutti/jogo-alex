import crypto from 'node:crypto';

export const secureFloat = () => crypto.randomInt(0, 0x100000000) / 0x100000000;

export const pickWeighted = (entries) => {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = secureFloat() * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.key;
  }
  return entries[entries.length - 1].key;
};

export const money = (value) => Number(Math.max(0, value).toFixed(2));

export const validBet = (value, fallback = 1) => {
  const bet = Number(value);
  return Number.isFinite(bet) && bet > 0 ? bet : fallback;
};
